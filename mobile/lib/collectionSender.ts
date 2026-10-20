import { File } from 'expo-file-system';
import { ApiError, apiFetch } from './api';
import { buildFileFormData, listUploadFiles, type CollectionInput } from './collectionUpload';
import type { SendOutcome } from './syncEngine';

// Envio de UMA coleta ao servidor. Nunca lança erro: tudo vira um SendOutcome para a fila decidir.
//
// O envio é separado em duas etapas, para um arquivo pesado nunca travar a fila:
//  1. POST /collection/sync (JSON): as respostas, sem arquivo. Idempotente pelo clientId (UUID do aparelho);
//     responde ACCEPTED, ALREADY_EXISTS ou REJECTED com motivo.
//  2. POST /collection/:clientId/files (multipart): um arquivo por requisição (foto, áudio de questão ou áudio
//     da entrevista), ligado à coleta pelo UUID e à questão. Reenviar o mesmo arquivo não duplica.

const SYNC_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 3 * 60_000; // áudio de entrevista longa e várias fotos pesam dezenas de MB

class Unreachable extends Error {}

async function post(path: string, body: BodyInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await apiFetch(path, { method: 'POST', body, signal: controller.signal });
    } catch (error) {
        if (error instanceof ApiError) throw error; // sessão expirada
        // O motivo real (ex.: arquivo ilegível, conexão encerrada pelo servidor) só aparece aqui, no log do Expo
        console.log(`Falha de rede em POST ${path}:`, error);
        throw new Unreachable(
            controller.signal.aborted
                ? 'O servidor demorou demais para responder.'
                : 'Sem conexão com o servidor.',
        );
    } finally {
        clearTimeout(timer);
    }
}

// Resposta de erro do servidor (400, 403, 404, 5xx...). Falha temporária é a que vale tentar de novo sozinho.
async function failureFromHttp(response: Response): Promise<SendOutcome> {
    const body = await response.json().catch(() => null);
    const message: string | undefined = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    const temporary = response.status >= 500 || response.status === 408 || response.status === 429;

    // Erro temporário: o texto do servidor é genérico e em inglês ("Internal server error"), então usa o do app.
    // Recusa (4xx): o servidor explica o motivo em português ("Você não está vinculado a esta pesquisa.").
    const reason = temporary
        ? 'O servidor teve um problema ao receber a coleta. O app tenta de novo sozinho.'
        : message || `O servidor recusou a coleta (erro ${response.status}).`;

    return {
        kind: 'failed',
        reason,
        code: typeof body?.code === 'string' ? body.code : undefined,
        retryable: temporary,
    };
}

// ---------- Sem arquivo: POST /collection/sync ----------

interface SyncResult {
    clientId?: string | null;
    status?: string;
    code?: string;
    reason?: string;
    retryable?: boolean;
}

async function sendViaSync(input: CollectionInput): Promise<SendOutcome> {
    const body = JSON.stringify({
        deviceId: input.deviceId ?? 'desconhecido',
        collections: [
            {
                clientId: input.clientId,
                researchId: input.researchId,
                startedAt: input.startedAt,
                finishedAt: input.finishedAt,
                consent: input.consent,
                answers: input.answers,
            },
        ],
    });

    const response = await post('/collection/sync', body, SYNC_TIMEOUT_MS);
    if (!response.ok) return failureFromHttp(response);

    const data = await response.json().catch(() => null);
    const results: SyncResult[] = Array.isArray(data?.results) ? data.results : [];
    // Casa pelo identificador da coleta, não pela posição
    const result = results.find((r) => r.clientId?.toLowerCase() === input.clientId.toLowerCase());

    if (result?.status === 'ACCEPTED') return { kind: 'confirmed', alreadyExisted: false };
    if (result?.status === 'ALREADY_EXISTS') return { kind: 'confirmed', alreadyExisted: true };
    if (result?.status === 'REJECTED') {
        return {
            kind: 'failed',
            reason: result.reason || 'O servidor recusou esta coleta.',
            code: result.code,
            retryable: result.retryable === true,
        };
    }
    return { kind: 'failed', reason: 'Resposta do servidor não reconhecida. Tente novamente.', retryable: true };
}

// ---------- Arquivos: POST /collection/:clientId/files (um por requisição) ----------

function fileExists(uri: string): boolean {
    try {
        return new File(uri).exists;
    } catch {
        return false;
    }
}

function removeFileQuietly(uri: string): void {
    try {
        const file = new File(uri);
        if (file.exists) file.delete();
    } catch {
        // arquivo que o sistema não deixa apagar não atrapalha o envio
    }
}

/**
 * Envia os arquivos da coleta que o servidor ainda não tem, um a um. A coleta (respostas) já chegou antes.
 * - arquivo que o servidor já recebeu (resposta ALREADY_EXISTS) conta como enviado: não duplica;
 * - falha de rede ou do servidor para na hora (o que já subiu não sobe de novo na próxima rodada);
 * - recusa definitiva de um arquivo (tipo, tamanho) não impede os outros: a coleta fica na fila com o motivo.
 */
export async function sendCollectionFiles(
    input: CollectionInput,
    uploadedKeys: string[],
    onUploaded: (key: string) => Promise<void>,
): Promise<SendOutcome> {
    try {
        let refusal: SendOutcome | null = null;

        for (const file of listUploadFiles(input)) {
            if (uploadedKeys.includes(file.key)) continue;

            // Arquivo que sumiu do aparelho não tem como ser reenviado: não prende a coleta na fila para sempre.
            if (!fileExists(file.uri)) {
                await onUploaded(file.key);
                continue;
            }

            const response = await post(
                `/collection/${encodeURIComponent(input.clientId)}/files`,
                buildFileFormData(file),
                UPLOAD_TIMEOUT_MS,
            );

            if (!response.ok) {
                const failure = await failureFromHttp(response);
                if (failure.kind === 'failed' && failure.code === 'COLLECTION_NOT_RECEIVED') {
                    // O servidor não tem a coleta: quem chama volta a enviar as respostas primeiro.
                    return { ...failure, reason: 'O servidor não encontrou esta coleta. As respostas serão enviadas de novo.', retryable: true };
                }
                if (failure.kind === 'failed' && !failure.retryable) {
                    refusal = { ...failure, reason: `O servidor recusou ${file.label}: ${failure.reason}` };
                    continue;
                }
                return failure;
            }

            await onUploaded(file.key);
            removeFileQuietly(file.uri); // já está no servidor: libera o espaço do aparelho
        }

        return refusal ?? { kind: 'confirmed', alreadyExisted: false };
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) return { kind: 'auth' };
        if (error instanceof Unreachable) return { kind: 'unreachable', reason: error.message };
        console.log('Falha inesperada ao enviar os arquivos da coleta:', error);
        return { kind: 'failed', reason: 'Erro inesperado ao enviar os arquivos. Tente novamente.', retryable: true };
    }
}

// ---------- Entrada ----------

/** Etapa 1: as respostas da coleta (sem arquivos) chegam primeiro. */
export async function sendCollection(input: CollectionInput): Promise<SendOutcome> {
    try {
        return await sendViaSync(input);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) return { kind: 'auth' };
        if (error instanceof Unreachable) return { kind: 'unreachable', reason: error.message };
        console.log('Falha inesperada ao enviar a coleta:', error);
        return { kind: 'failed', reason: 'Erro inesperado ao enviar a coleta. Tente novamente.', retryable: true };
    }
}
