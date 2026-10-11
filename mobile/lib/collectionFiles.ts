import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    FileUploadError,
    uploadCollectionFile,
    type CollectionFileInput,
    type CollectionInput,
} from './collectionUpload';

// Envio dos arquivos (fotos e áudio) de uma coleta já enviada.
// Cada arquivo sobe sozinho: o que falha é tentado de novo, sem reenviar a coleta nem os outros arquivos.
//
// O que já subiu fica anotado no aparelho (uma chave por coleta). ATENÇÃO ao prefixo: não pode começar
// com "collection_", senão a lista de coletas do collectionStore confundiria esta anotação com uma coleta.
const STATE_PREFIX = 'fileupload_';

// Tentativas por arquivo em cada rodada, com espera crescente entre elas (1,5 s, 3 s)
const MAX_ATTEMPTS = 3;
const BASE_WAIT_MS = 1500;

type FileState = { status: 'UPLOADED' } | { status: 'REFUSED'; code?: string; message: string };
type StateMap = Record<string, FileState>;

export interface FileSyncResult {
    total: number;
    /** Subiram (ou o servidor já tinha) nesta rodada */
    sent: number;
    /** Já tinham subido em rodadas anteriores */
    alreadyDone: number;
    /** Recusados em definitivo pelo servidor (arquivo inválido ou grande demais): não adianta reenviar */
    refused: number;
    /** Ainda faltam: sem rede, servidor fora do ar ou coleta ainda não recebida. Tente de novo depois */
    pending: number;
    /** Tudo no servidor */
    complete: boolean;
}

const stateKey = (clientId: string) => `${STATE_PREFIX}${clientId}`;

async function readState(clientId: string): Promise<StateMap> {
    const json = await AsyncStorage.getItem(stateKey(clientId));
    return json ? (JSON.parse(json) as StateMap) : {};
}

async function writeState(clientId: string, state: StateMap): Promise<void> {
    await AsyncStorage.setItem(stateKey(clientId), JSON.stringify(state));
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface FileItem {
    key: string;
    file: CollectionFileInput;
}

// Arquivos da coleta: o áudio primeiro (é o maior e o mais importante), depois as fotos.
function listFiles(input: CollectionInput): FileItem[] {
    const items: FileItem[] = [];

    if (input.audio) {
        items.push({
            key: 'AUDIO',
            file: {
                kind: 'AUDIO',
                uri: input.audio.uri,
                name: `coleta-${input.clientId}.m4a`,
                mimeType: input.audio.mimeType ?? 'audio/mp4',
            },
        });
    }

    for (const photo of input.photos ?? []) {
        items.push({
            key: `PHOTO:${photo.questionId}:${photo.name}`,
            file: {
                kind: 'PHOTO',
                questionId: photo.questionId,
                uri: photo.uri,
                name: photo.name,
                mimeType: photo.mimeType,
            },
        });
    }

    return items;
}

/** Quantos arquivos da coleta ainda não subiram (para mostrar na fila de sincronização). */
export async function countPendingFiles(input: CollectionInput): Promise<number> {
    const state = await readState(input.clientId);
    return listFiles(input).filter((item) => state[item.key]?.status !== 'UPLOADED').length;
}

/**
 * Sobe os arquivos que ainda faltam de uma coleta (que já foi enviada ao servidor).
 * Nunca lança erro por falha de envio: o resultado diz o que ficou pendente, e basta chamar de novo.
 */
export async function uploadPendingFiles(input: CollectionInput): Promise<FileSyncResult> {
    const state = await readState(input.clientId);
    const items = listFiles(input);
    const result: FileSyncResult = { total: items.length, sent: 0, alreadyDone: 0, refused: 0, pending: 0, complete: false };

    // Sem rede (ou sessão expirada): não adianta insistir nos próximos arquivos desta rodada
    let stopped = false;

    for (const item of items) {
        const known = state[item.key];
        if (known?.status === 'UPLOADED') {
            result.alreadyDone += 1;
            continue;
        }
        if (known?.status === 'REFUSED') {
            result.refused += 1;
            continue;
        }
        if (stopped) {
            result.pending += 1;
            continue;
        }

        let settled = false;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS && !settled; attempt++) {
            try {
                await uploadCollectionFile(input.clientId, item.file);
                state[item.key] = { status: 'UPLOADED' };
                await writeState(input.clientId, state);
                result.sent += 1;
                settled = true;
            } catch (error) {
                if (error instanceof FileUploadError && !error.retryable) {
                    state[item.key] = { status: 'REFUSED', code: error.code, message: error.message };
                    await writeState(input.clientId, state);
                    result.refused += 1;
                    settled = true;
                    break;
                }

                // Qualquer outra falha que não seja resposta do servidor é rede ou sessão
                if (!(error instanceof FileUploadError)) stopped = true;
                if (stopped) break;
                if (attempt < MAX_ATTEMPTS) await wait(BASE_WAIT_MS * 2 ** (attempt - 1));
            }
        }

        if (!settled) result.pending += 1;
    }

    result.complete = result.pending === 0 && result.refused === 0;
    return result;
}
