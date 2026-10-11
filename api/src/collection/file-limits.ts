// Foto já reduzida pelo app costuma ter 200 a 500 KB: 15 MB é folga larga.
export function maxPhotoBytes(): number {
    return Number(process.env.PHOTO_MAX_BYTES) || 15 * 1024 * 1024;
}

// Áudio da entrevista (padrão 150 MB).
export function maxAudioBytes(): number {
    return Number(process.env.AUDIO_MAX_BYTES) || 150 * 1024 * 1024;
}

// Teto do upload: o maior entre os dois. Cada tipo é conferido de novo no serviço.
export function maxUploadBytes(): number {
    return Math.max(maxPhotoBytes(), maxAudioBytes());
}

export function formatLimit(bytes: number): string {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
}
