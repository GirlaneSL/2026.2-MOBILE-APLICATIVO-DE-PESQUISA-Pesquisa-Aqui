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

// Monta o multipart da coleta: o campo `payload` (JSON) e um campo por tipo de arquivo.
// O servidor liga cada arquivo à sua questão pela POSIÇÃO: `payload.photos[i]` descreve o i-ésimo `photos`,
// e `payload.questionAudios[i]` o i-ésimo `questionAudios`. Por isso a lista e os arquivos saem do mesmo laço,
// na mesma ordem, e não dependem de o nome do arquivo chegar intacto ao servidor.
export function buildCollectionFormData(input: CollectionInput): FormData {
    const photos = input.photos ?? [];
    const questionAudios = input.questionAudios ?? [];

    const payload = {
        researchId: input.researchId,
        clientId: input.clientId,
        deviceId: input.deviceId,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        answers: input.answers,
        consent: input.consent,
        audioDurationSeconds: input.audio ? Math.round(input.audio.durationSeconds) : undefined,
        photos: photos.map(({ questionId, name }) => ({ questionId, name })),
        questionAudios: questionAudios.map(({ questionId, name, durationSeconds }) => ({
            questionId,
            name,
            durationSeconds: Math.round(durationSeconds),
        })),
    };

    const form = new FormData();
    form.append('payload', JSON.stringify(payload));

    if (input.audio) {
        form.append(
            'audio',
            filePart(input.audio.uri, `coleta-${input.clientId}.m4a`, input.audio.mimeType ?? 'audio/mp4'),
        );
    }

    for (const photo of photos) {
        form.append('photos', filePart(photo.uri, photo.name, photo.mimeType));
    }

    for (const audio of questionAudios) {
        form.append('questionAudios', filePart(audio.uri, audio.name, audio.mimeType));
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
