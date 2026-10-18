import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

// Tipos de áudio aceitos e a extensão com que são guardados. A extensão vem do tipo declarado,
// nunca do nome do arquivo enviado.
const EXTENSIONS: Record<string, string> = {
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/3gpp': '3gp',
};

export function audioExtensionFor(mimeType: string): string | null {
    return EXTENSIONS[mimeType.toLowerCase().split(';')[0].trim()] ?? null;
}

// Fotos aceitas nas respostas e a extensão com que são guardadas (também derivada do tipo declarado).
const IMAGE_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
};

export function imageExtensionFor(mimeType: string): string | null {
    return IMAGE_EXTENSIONS[mimeType.toLowerCase().split(';')[0].trim()] ?? null;
}

// Tipo de conteúdo de um arquivo de resposta já guardado, a partir da extensão gravada por este módulo.
const MEDIA_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
    wav: 'audio/wav',
    '3gp': 'audio/3gpp',
};

export function mediaTypeFor(fileName: string): string | null {
    return MEDIA_TYPES[fileName.split('.').pop()?.toLowerCase() ?? ''] ?? null;
}

// Guarda o áudio das entrevistas e os arquivos das respostas (fotos e áudios de questão) em disco, fora de qualquer pasta pública:
// o único caminho até ele é o endpoint autenticado da coleta.
@Injectable()
export class AudioStorage {
    private get root(): string {
        return resolve(process.env.AUDIO_STORAGE_DIR || join(process.cwd(), 'storage', 'audio'));
    }

    async save(researchId: number, buffer: Buffer, extension: string): Promise<string> {
        const relativePath = `${researchId}/${randomUUID()}.${extension}`;
        const target = this.resolveSafe(relativePath);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, buffer, { flag: 'wx' });
        return relativePath;
    }

    // Arquivo de uma resposta: `<pesquisa>/answers/<coleta>/<arquivo>`. O nome é montado pelo servidor.
    async saveAt(relativePath: string, buffer: Buffer): Promise<void> {
        const target = this.resolveSafe(relativePath);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, buffer, { flag: 'wx' });
    }

    // Nomes dos arquivos de uma pasta (vazio se ela não existe).
    async list(relativeDir: string): Promise<string[]> {
        try {
            return await readdir(this.resolveSafe(relativeDir));
        } catch {
            return [];
        }
    }

    async removeDir(relativeDir: string): Promise<void> {
        await rm(this.resolveSafe(relativeDir), { recursive: true, force: true });
    }

    async open(relativePath: string): Promise<{ stream: ReadStream; size: number } | null> {
        const target = this.resolveSafe(relativePath);
        try {
            const info = await stat(target);
            return { stream: createReadStream(target), size: info.size };
        } catch {
            return null;
        }
    }

    async remove(relativePath: string): Promise<void> {
        await rm(this.resolveSafe(relativePath), { force: true });
    }

    // Garante que o caminho guardado no banco nunca escapa da pasta de áudios.
    private resolveSafe(relativePath: string): string {
        const target = resolve(this.root, relativePath);
        if (!target.startsWith(this.root + sep)) throw new Error('Invalid audio path');
        return target;
    }
}
