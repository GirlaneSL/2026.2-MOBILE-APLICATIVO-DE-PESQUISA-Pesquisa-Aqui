import { apiFetch } from "./apiFetcher";

export interface CollectionFilesCounts {
    expected: number;
    received: number;
    missing: number;
}

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
    // Arquivos (fotos e áudio) que a coleta deve ter: quantos chegaram e quantos faltam
    files: CollectionFilesCounts;
}

export interface CollectionFileEntry {
    kind: 'PHOTO' | 'AUDIO';
    questionId: number | null;
    fileName: string;
    received: boolean;
    fileId: number | null;
    mimeType: string | null;
    sizeBytes: number | null;
}

export interface CollectionFilesDetail extends CollectionFilesCounts {
    collectionId: number;
    files: CollectionFileEntry[];
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

    return response.blob();
};

// Lista os arquivos da coleta: os que já chegaram e os que faltam.
export const getCollectionFiles = async (collectionId: number): Promise<CollectionFilesDetail> => {
    const response = await apiFetch(`/collection/${collectionId}/files`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw await readError(response, 'Falha ao carregar os arquivos da coleta');

    return response.json();
};

// Baixa uma foto da coleta pela API autenticada (o arquivo nunca é público).
export const getCollectionFileBlob = async (collectionId: number, fileId: number): Promise<Blob> => {
    const response = await apiFetch(`/collection/${collectionId}/files/${fileId}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw await readError(response, 'Falha ao carregar o arquivo da coleta');

    return response.blob();
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
