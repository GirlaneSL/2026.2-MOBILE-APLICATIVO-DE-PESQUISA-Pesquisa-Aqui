import { apiFetch } from "./apiFetcher";

export interface CollectionSummary {
    id: number;
    researchId: number;
    researcherId: number;
    researcherName: string | null;
    startedAt: string;
    finishedAt: string;
    receivedAt: string;
    consent: {
        given: boolean;
        at: string | null;
        confirmedById: number | null;
        confirmedByName: string | null;
    };
    hasAudio: boolean;
    audioDurationSeconds: number | null;
    audioSizeBytes: number | null;
}

export interface CollectionQuestionOption {
    id: number;
    text: string;
}

export interface CollectionQuestion {
    id: number;
    statement: string;
    type: string;
    isRequired: boolean;
    scaleLeftLabel: string | null;
    scaleRightLabel: string | null;
    options: CollectionQuestionOption[];
    // Valor bruto gravado pelo aplicativo; null quando a pergunta ficou sem resposta.
    answer: string | null;
}

export interface CollectionSection {
    id: number;
    title: string;
    questions: CollectionQuestion[];
}

export interface CollectionDetail extends CollectionSummary {
    sections: CollectionSection[];
}

const readError = async (response: Response, fallback: string) => {
    const errorBody = await response.json().catch(() => null);
    const message = Array.isArray(errorBody?.message) ? errorBody.message.join(', ') : errorBody?.message;
    const error = new Error(message || fallback) as Error & { status?: number };
    error.status = response.status;
    return error;
};

export const getCollections = async (researchId: number): Promise<CollectionSummary[]> => {
    const response = await apiFetch(`/collection?researchId=${researchId}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw await readError(response, 'Falha ao carregar as coletas');

    return response.json();
};

// Abre uma coleta com as respostas, na ordem do questionário.
export const getCollection = async (collectionId: number): Promise<CollectionDetail> => {
    const response = await apiFetch(`/collection/${collectionId}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw await readError(response, 'Falha ao carregar as respostas da coleta');

    return response.json();
};

// Baixa o áudio de uma coleta pela API autenticada (o arquivo nunca é público).
export const getCollectionAudio = async (collectionId: number): Promise<Blob> => {
    const response = await apiFetch(`/collection/${collectionId}/audio`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw await readError(response, 'Falha ao carregar o áudio da coleta');

    const blob = await response.blob();
    // O player só toca se o arquivo tiver um tipo de áudio: se o cabeçalho vier sem ele, assume o do app (m4a).
    return blob.type.startsWith('audio/') ? blob : new Blob([blob], { type: 'audio/mp4' });
};

// 3725 -> "1:02:05"; 65 -> "1:05"
export const formatDuration = (totalSeconds: number | null): string => {
    if (totalSeconds === null || totalSeconds === undefined) return '-';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ss = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}` : `${minutes}:${ss}`;
};

// Resposta pronta para exibir. Cada tipo de pergunta chega do aplicativo num formato próprio.
export type FormattedAnswer =
    | { kind: 'empty' }
    | { kind: 'text'; text: string }
    | { kind: 'list'; items: string[] }
    | { kind: 'scale'; value: number; leftLabel: string | null; rightLabel: string | null }
    | { kind: 'location'; latitude: number; longitude: number; accuracy: number | null; lowAccuracy: boolean }
    | { kind: 'file'; names: string[] };

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

// "2026-10-18" -> "18/10/2026" (sem passar por Date, que deslocaria o dia pelo fuso)
const formatIsoDate = (raw: string) => {
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
};

export const formatAnswer = (question: CollectionQuestion): FormattedAnswer => {
    const raw = question.answer;
    if (raw === null || raw.trim() === '') return { kind: 'empty' };

    const optionText = (id: number | string) =>
        question.options.find((option) => String(option.id) === String(id))?.text ?? String(id);

    switch (question.type) {
        case 'YES_NO':
            return { kind: 'text', text: raw === 'YES' ? 'Sim' : raw === 'NO' ? 'Não' : raw };

        case 'DATE':
            return { kind: 'text', text: formatIsoDate(raw) };

        case 'SINGLE_CHOICE':
            return { kind: 'text', text: optionText(raw) };

        case 'MULTIPLE_CHOICE': {
            const parsed = parseJson(raw);
            if (!Array.isArray(parsed)) return { kind: 'text', text: optionText(raw) };
            return parsed.length === 0
                ? { kind: 'empty' }
                : { kind: 'list', items: parsed.map((id) => optionText(id as number | string)) };
        }

        case 'SCALE_1_5': {
            const value = Number(raw);
            if (!Number.isFinite(value)) return { kind: 'text', text: raw };
            return { kind: 'scale', value, leftLabel: question.scaleLeftLabel, rightLabel: question.scaleRightLabel };
        }

        case 'LOCATION': {
            const parsed = parseJson(raw) as {
                latitude?: unknown;
                longitude?: unknown;
                accuracy?: unknown;
                lowAccuracy?: unknown;
            } | null;
            if (typeof parsed?.latitude !== 'number' || typeof parsed?.longitude !== 'number') {
                return { kind: 'text', text: raw };
            }
            return {
                kind: 'location',
                latitude: parsed.latitude,
                longitude: parsed.longitude,
                accuracy: typeof parsed.accuracy === 'number' ? parsed.accuracy : null,
                lowAccuracy: parsed.lowAccuracy === true,
            };
        }

        // O aplicativo só envia o nome do arquivo; as fotos e o áudio da pergunta não chegam ao servidor.
        case 'PHOTO':
        case 'AUDIO':
            return { kind: 'file', names: [raw] };

        case 'MULTIPLE_PHOTOS': {
            const parsed = parseJson(raw);
            return { kind: 'file', names: Array.isArray(parsed) ? parsed.map(String) : [raw] };
        }

        default:
            return { kind: 'text', text: raw };
    }
};
