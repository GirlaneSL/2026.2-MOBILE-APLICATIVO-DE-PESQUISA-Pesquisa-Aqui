import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
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

// Guarda o áudio das entrevistas em disco, fora de qualquer pasta pública:
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
