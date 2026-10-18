import { File } from 'expo-file-system';
import { ApiError, apiFetch } from './api';
import type { CollectionInput } from './collectionUpload';
import type { SendOutcome } from './syncEngine';

// Envio de UMA coleta ao servidor. Nunca lança erro: tudo vira um SendOutcome para a fila decidir.
//
// Dois caminhos, porque o servidor tem dois endpoints:
//  - POST /collection/sync  (JSON): a coleta sem arquivo. É idempotente pelo clientId (UUID do aparelho) e responde
//    ACCEPTED, ALREADY_EXISTS ou REJECTED com motivo.
//  - POST /collection (multipart): só quando há áudio da entrevista, o único arquivo que o servidor recebe hoje.
//    Também é idempotente pelo clientId: reenviar devolve a coleta já gravada.
// Fotos e áudios de questão ainda não têm endpoint: o servidor recebe o nome do arquivo na resposta, não o arquivo.

const SYNC_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 3 * 60_000; // o áudio de uma entrevista longa pesa dezenas de MB

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

// ---------- Com áudio da entrevista: POST /collection (multipart) ----------

function audioExists(uri: string): boolean {
    try {
        return new File(uri).exists;
    } catch {
        return false;
    }
}

async function sendWithAudio(input: CollectionInput, audio: NonNullable<CollectionInput['audio']>): Promise<SendOutcome> {
    // Só o que o servidor aceita neste endpoint: o campo `audio` é o único arquivo permitido
    const form = new FormData();
    form.append(
        'payload',
        JSON.stringify({
            researchId: input.researchId,
            clientId: input.clientId,
            deviceId: input.deviceId,
            startedAt: input.startedAt,
            finishedAt: input.finishedAt,
            consent: input.consent,
            answers: input.answers,
            audioDurationSeconds: Math.round(audio.durationSeconds),
        }),
    );
    // O fetch do React Native só lê arquivo de endereço com esquema (file://, content://)
    const audioUri = /^[a-z][a-z0-9+.-]*:\/\//i.test(audio.uri) ? audio.uri : `file://${audio.uri}`;
    form.append('audio', {
        uri: audioUri,
        name: `coleta-${input.clientId}.m4a`,
        type: audio.mimeType ?? 'audio/mp4',
    } as unknown as Blob);

    const response = await post('/collection', form, UPLOAD_TIMEOUT_MS);
    if (!response.ok) return failureFromHttp(response);
    return { kind: 'confirmed', alreadyExisted: false };
}

// ---------- Entrada ----------

export async function sendCollection(input: CollectionInput): Promise<SendOutcome> {
    try {
        // Áudio que sumiu do aparelho não tem como ser reenviado: as respostas seguem sem ele,
        // em vez de a coleta ficar presa na fila para sempre.
        const audio = input.audio && audioExists(input.audio.uri) ? input.audio : undefined;
        return audio ? await sendWithAudio(input, audio) : await sendViaSync(input);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) return { kind: 'auth' };
        if (error instanceof Unreachable) return { kind: 'unreachable', reason: error.message };
        console.log('Falha inesperada ao enviar a coleta:', error);
        return { kind: 'failed', reason: 'Erro inesperado ao enviar a coleta. Tente novamente.', retryable: true };
    }
}
