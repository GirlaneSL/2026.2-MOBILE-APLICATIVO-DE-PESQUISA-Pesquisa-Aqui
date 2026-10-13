import { apiFetch } from "./api";

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

    if (input.audio) {
        // Formato de arquivo do React Native para multipart
        form.append('audio', {
            uri: input.audio.uri,
            name: `coleta-${input.clientId}.m4a`,
            type: input.audio.mimeType ?? 'audio/mp4',
        } as unknown as Blob);
    }

    // Fotos: um campo `photos` por arquivo, todos na mesma requisição da coleta
    for (const photo of input.photos ?? []) {
        form.append('photos', {
            uri: photo.uri,
            name: photo.name,
            type: photo.mimeType,
        } as unknown as Blob);
    }

    // Áudios das questões: um campo `questionAudios` por arquivo, todos na mesma requisição da coleta
    for (const audio of input.questionAudios ?? []) {
        form.append('questionAudios', {
            uri: audio.uri,
            name: audio.name,
            type: audio.mimeType,
        } as unknown as Blob);
    }

    return form;
}

// Envia a coleta: respostas, consentimento (data, hora) e o áudio, tudo na mesma requisição.
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
