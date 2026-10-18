import { File } from 'expo-file-system';
import { apiFetch } from "./api";

// Parte de arquivo para o FormData. O fetch do Expo não aceita o formato antigo do React Native
// ({ uri, name, type }): só texto, Blob ou um objeto com `bytes()`. Aqui o arquivo é lido do aparelho
// no momento do envio, e nome e tipo ficam sob controle do app (o servidor valida o tipo do áudio).
export function filePart(uri: string, name: string, type: string): Blob {
    // O File só lê endereço com esquema (file://, content://)
    const fileUri = /^[a-z][a-z0-9+.-]*:\/\//i.test(uri) ? uri : `file://${uri}`;
    const file = new File(fileUri);
    return { name, type, bytes: () => file.bytes() } as unknown as Blob;
}

export interface CollectionAnswer {
    questionId: number;
    // Respostas compostas (múltipla escolha, localização...) vão serializadas como texto
    value: string;
}

// Aceite do entrevistado, registrado no aparelho antes de a coleta começar.
export interface InterviewConsent {
    accepted: true;
    acceptedAt: string; // ISO 8601
}

// Momento em que a gravação da entrevista parou sem o pesquisador pedir (ligação, falta de espaço...).
export interface RecordingIssue {
    at: string; // ISO 8601
    reason: 'stopped' | 'error' | 'low-space';
    resumedAt?: string; // ISO 8601, só existe se o pesquisador conseguiu retomar
}

export interface CollectionAudio {
    uri: string;
    durationSeconds: number;
    mimeType?: string;
    // true = a gravação teve interrupções: o áudio tem lacunas e o servidor/web devem tratá-lo como incompleto
    hasGaps?: boolean;
}

// Áudio de uma questão "responda falando". O arquivo já está guardado no aparelho.
export interface CollectionQuestionAudio {
    questionId: number;
    uri: string;
    // Nome do arquivo: é o valor que a resposta da questão guarda, para o servidor ligar arquivo e questão
    name: string;
    mimeType: string;
    durationSeconds: number;
}

// Foto tirada numa questão de foto / várias fotos. O arquivo já está reduzido e guardado no aparelho.
export interface CollectionPhoto {
    questionId: number;
    uri: string;
    // Nome do arquivo: é o valor que a resposta da questão guarda, para o servidor ligar arquivo e questão
    name: string;
    mimeType: string;
}

export interface CollectionInput {
    researchId: number;
    // Identificador único da coleta no aparelho: reenviar a mesma coleta não a duplica no servidor
    clientId: string;
    deviceId?: string;
    startedAt: string;
    finishedAt: string;
    answers: CollectionAnswer[];
    consent?: InterviewConsent;
    audio?: CollectionAudio;
    recordingIssues?: RecordingIssue[];
    photos?: CollectionPhoto[];
    questionAudios?: CollectionQuestionAudio[];
}

// O servidor recusou a coleta por falta do consentimento registrado (pesquisa com gravação).
export class ConsentRequiredError extends Error { }

// Arquivo (foto ou áudio) a enviar depois que a coleta chegou ao servidor.
export type CollectionFileInput =
    | { kind: 'PHOTO'; questionId: number; uri: string; name: string; mimeType: string }
    | { kind: 'AUDIO'; uri: string; name: string; mimeType: string };

// O servidor respondeu ao envio do arquivo com erro. `retryable` diz se vale tentar de novo:
// falha do servidor e "coleta ainda não chegou" passam; arquivo inválido ou grande demais, não.
export class FileUploadError extends Error {
    status: number;
    code: string | undefined;
    retryable: boolean;

    constructor(message: string, status: number, code: string | undefined, retryable: boolean) {
        super(message);
        this.status = status;
        this.code = code;
        this.retryable = retryable;
    }
}

// Só os dados da coleta: os arquivos (áudio e fotos) sobem depois, um a um, por uploadCollectionFile.
// `audioDurationSeconds` avisa o servidor de que um áudio está a caminho.
export function buildCollectionFormData(input: CollectionInput): FormData {
    const payload = {
        researchId: input.researchId,
        clientId: input.clientId,
        deviceId: input.deviceId,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        answers: input.answers,
        consent: input.consent,
        audioDurationSeconds: input.audio?.durationSeconds,
        audioHasGaps: input.audio?.hasGaps,
        recordingIssues: input.recordingIssues,
        questionAudios: input.questionAudios?.map(({ questionId, name, durationSeconds }) => ({
            questionId,
            name,
            durationSeconds,
        })),
    };

    const form = new FormData();
    form.append('payload', JSON.stringify(payload));
    return form;
}

// Envia a coleta: respostas e consentimento (data, hora). Os arquivos vão em seguida, separados.
export async function uploadCollection(input: CollectionInput) {
    const response = await apiFetch('/collection', {
        method: 'POST',
        body: buildCollectionFormData(input),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (body?.code === 'CONSENT_REQUIRED') throw new ConsentRequiredError(body.message);
        throw new Error(
            Array.isArray(body?.message) ? body.message.join(', ') : body?.message || 'Falha ao enviar a coleta'
        );
    }

    return response.json();
}

// Envia um arquivo de uma coleta que já chegou. O mesmo arquivo enviado de novo volta como
// ALREADY_RECEIVED, e isso conta como sucesso: o servidor já tem o arquivo.
export async function uploadCollectionFile(
    clientId: string,
    file: CollectionFileInput,
): Promise<{ status: 'RECEIVED' | 'ALREADY_RECEIVED' }> {
    const form = new FormData();
    form.append('kind', file.kind);
    if (file.kind === 'PHOTO') {
        form.append('questionId', String(file.questionId));
        form.append('fileName', file.name);
    }
    // O arquivo é lido do aparelho na hora do envio (o fetch do Expo não aceita { uri, name, type })
    form.append('file', filePart(file.uri, file.name, file.mimeType));

    const response = await apiFetch(`/collection/${encodeURIComponent(clientId)}/files`, {
        method: 'POST',
        body: form,
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
        const retryable =
            response.status >= 500 ||
            response.status === 408 ||
            response.status === 429 ||
            body?.code === 'COLLECTION_NOT_RECEIVED';
        throw new FileUploadError(message || 'Falha ao enviar o arquivo', response.status, body?.code, retryable);
    }

    return response.json();
}
