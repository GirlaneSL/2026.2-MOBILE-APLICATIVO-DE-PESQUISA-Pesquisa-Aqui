import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

// Tipos de foto aceitos. A extensão vem do tipo declarado, nunca do nome enviado.
const EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

export function photoExtensionFor(mimeType: string): string | null {
    return EXTENSIONS[mimeType.toLowerCase().split(';')[0].trim()] ?? null;
}

// Confere o início do arquivo: o tipo declarado não basta para confiar no conteúdo.
export function matchesImageSignature(buffer: Buffer, extension: string): boolean {
    if (extension === 'jpg') {
        return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (extension === 'png') {
        const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        return buffer.length > 8 && signature.every((byte, i) => buffer[i] === byte);
    }
    if (extension === 'webp') {
        return (
            buffer.length > 12 &&
            buffer.toString('ascii', 0, 4) === 'RIFF' &&
            buffer.toString('ascii', 8, 12) === 'WEBP'
        );
    }
    return false;
}

// Guarda as fotos das coletas em disco, fora de qualquer pasta pública:
// o único caminho até elas é o endpoint autenticado da coleta.
@Injectable()
export class PhotoStorage {
    private get root(): string {
        return resolve(process.env.PHOTO_STORAGE_DIR || join(process.cwd(), 'storage', 'photos'));
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

    // Garante que o caminho guardado no banco nunca escapa da pasta de fotos.
    private resolveSafe(relativePath: string): string {
        const target = resolve(this.root, relativePath);
        if (!target.startsWith(this.root + sep)) throw new Error('Invalid photo path');
        return target;
    }
}
