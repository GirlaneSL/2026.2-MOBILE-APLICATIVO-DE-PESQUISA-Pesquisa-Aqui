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
