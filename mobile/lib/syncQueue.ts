import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { deleteAudio } from './audioStorage';
import { sendCollection } from './collectionSender';
import {
    buildCollectionInput,
    getCollection,
    listSendQueue,
    recordSendFailure,
    removeCollection,
} from './collectionStore';
import { orderedQuestions } from './displayRules';
import { getCachedResearchPackage } from './researchCache';
import { createSyncEngine } from './syncEngine';

// A fila de envio do aparelho: o motor (syncEngine) ligado ao armazenamento local e à API.
// É um só para o app inteiro: a tela de sincronização, o envio automático e o fim da coleta usam este mesmo.
// Como vive fora das telas, o envio continua mesmo que o pesquisador saia da tela ou comece outra coleta.

export const syncQueue = createSyncEngine({
    async listQueue() {
        return (await listSendQueue()).map((collection) => ({
            clientId: collection.clientId,
            lastFailure: collection.sendState?.lastFailure,
        }));
    },

    async send(clientId) {
        const collection = await getCollection(clientId);
        if (!collection || collection.status !== 'FINISHED') {
            return { kind: 'failed', reason: 'Esta coleta não está mais no aparelho.', retryable: false };
        }

        // As regras de pulo vêm do pacote da pesquisa: questão escondida não viaja.
        // O pacote some se o pesquisador sair da conta, por isso este aviso.
        const pkg = await getCachedResearchPackage(collection.researchId);
        if (!pkg) {
            return {
                kind: 'failed',
                code: 'PACKAGE_MISSING',
                reason: 'A pesquisa não está mais baixada neste aparelho. Baixe-a de novo (com internet) e toque em "Tentar de novo".',
                retryable: false,
            };
        }

        const input = await buildCollectionInput(collection, orderedQuestions(pkg), pkg.displayRules);
        return sendCollection(input);
    },

    async onConfirmed(clientId) {
        const collection = await getCollection(clientId);
        await removeCollection(clientId); // sai da fila: o servidor já tem esta coleta
        // O áudio da entrevista seguiu junto com a coleta e não serve mais.
        // Fotos e áudios de questão ficam: o servidor ainda não recebe esses arquivos.
        if (collection?.audio?.uri) deleteAudio(collection.audio.uri);
    },

    onFailed: recordSendFailure,

    async isOnline() {
        return isNetworkReachable(await NetInfo.fetch());
    },
});

/** Há conexão de verdade? (conectado e, quando o sistema sabe, com acesso à internet) */
export function isNetworkReachable(state: NetInfoState): boolean {
    return !!state.isConnected && state.isInternetReachable !== false;
}

/**
 * A coleta acabou de ser finalizada: se há rede, o envio começa sozinho, sem esperar o pesquisador.
 * Não bloqueia quem chama (o pesquisador já pode começar a próxima coleta).
 */
export async function requestAutoSend(): Promise<void> {
    try {
        if (isNetworkReachable(await NetInfo.fetch())) void syncQueue.run({ trigger: 'auto' });
    } catch (error) {
        console.log('Falha ao verificar a rede para enviar a coleta:', error);
    }
}
