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

export interface CollectionAudio {
    uri: string;
    durationSeconds: number;
    mimeType?: string;
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
    photos?: CollectionPhoto[];
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
