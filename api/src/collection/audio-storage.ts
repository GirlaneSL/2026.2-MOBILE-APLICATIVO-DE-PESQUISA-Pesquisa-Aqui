import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

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

export interface StoredFile {
    stream: Readable;
    size: number;
}

// Tipo de recurso no Cloudinary: fotos são `image`; áudio é tratado pelo Cloudinary como `video`.
type CloudinaryKind = 'image' | 'video';
const IMAGE_FILE_EXTENSIONS = new Set(Object.values(IMAGE_EXTENSIONS));
const KINDS: CloudinaryKind[] = ['image', 'video'];

// Guarda o áudio das entrevistas e os arquivos das respostas (fotos e áudios de questão).
//
// Com o Cloudinary configurado (CLOUDINARY_URL, ou CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY +
// CLOUDINARY_API_SECRET) tudo vai para ele, como arquivo PRIVADO (`type: authenticated`): não existe
// link público, e a API continua sendo o único caminho até o arquivo (endpoint autenticado da coleta).
// Sem configuração, cai para o disco local (AUDIO_STORAGE_DIR) — pensado só para desenvolvimento.
//
// Os caminhos relativos (`<pesquisa>/<uuid>.m4a`, `<pesquisa>/answers/<coleta>/q1-0.jpg`) são os mesmos
// nos dois modos: no Cloudinary o caminho sem a extensão é o `public_id`.
@Injectable()
export class AudioStorage {
    private readonly logger = new Logger(AudioStorage.name);
    private cloudinaryReady: boolean | null = null;

    private get useCloudinary(): boolean {
        if (this.cloudinaryReady !== null) return this.cloudinaryReady;
        const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
        if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
            cloudinary.config({
                cloud_name: CLOUDINARY_CLOUD_NAME,
                api_key: CLOUDINARY_API_KEY,
                api_secret: CLOUDINARY_API_SECRET,
                secure: true,
            });
            this.cloudinaryReady = true;
        } else if (CLOUDINARY_URL) {
            cloudinary.config({ secure: true }); // o SDK lê a CLOUDINARY_URL sozinho
            this.cloudinaryReady = true;
        } else {
            this.cloudinaryReady = false;
            this.logger.warn('Cloudinary não configurado: mídias sendo gravadas em disco local (use só em desenvolvimento).');
        }
        return this.cloudinaryReady;
    }

    async save(researchId: number, buffer: Buffer, extension: string): Promise<string> {
        const relativePath = `${researchId}/${randomUUID()}.${extension}`;
        await this.saveAt(relativePath, buffer);
        return relativePath;
    }

    // Arquivo de uma resposta: `<pesquisa>/answers/<coleta>/<arquivo>`. O nome é montado pelo servidor.
    async saveAt(relativePath: string, buffer: Buffer): Promise<void> {
        if (this.useCloudinary) return this.cloudSave(relativePath, buffer);
        const target = this.resolveSafe(relativePath);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, buffer, { flag: 'wx' });
    }

    // Nomes dos arquivos de uma pasta (vazio se ela não existe).
    async list(relativeDir: string): Promise<string[]> {
        if (this.useCloudinary) return this.cloudList(relativeDir);
        try {
            return await readdir(this.resolveSafe(relativeDir));
        } catch {
            return [];
        }
    }

    async removeDir(relativeDir: string): Promise<void> {
        if (this.useCloudinary) return this.cloudRemoveDir(relativeDir);
        await rm(this.resolveSafe(relativeDir), { recursive: true, force: true });
    }

    async open(relativePath: string): Promise<StoredFile | null> {
        if (this.useCloudinary) return this.cloudOpen(relativePath);
        const target = this.resolveSafe(relativePath);
        try {
            const info = await stat(target);
            return { stream: createReadStream(target), size: info.size };
        } catch {
            return null;
        }
    }

    async remove(relativePath: string): Promise<void> {
        if (this.useCloudinary) return this.cloudRemove(relativePath);
        await rm(this.resolveSafe(relativePath), { force: true });
    }

    // ---------- Cloudinary ----------

    // `12/answers/3/q5-0.jpg` -> public_id `12/answers/3/q5-0`, formato `jpg`, recurso `image`.
    private cloudRef(relativePath: string): { publicId: string; format: string; kind: CloudinaryKind } {
        const clean = relativePath.replace(/\\/g, '/');
        if (clean.split('/').some((part) => part === '..' || part === '')) throw new Error('Invalid media path');
        const dot = clean.lastIndexOf('.');
        if (dot <= clean.lastIndexOf('/') + 1) throw new Error('Invalid media path');
        const format = clean.slice(dot + 1).toLowerCase();
        return {
            publicId: clean.slice(0, dot),
            format,
            kind: IMAGE_FILE_EXTENSIONS.has(format) ? 'image' : 'video',
        };
    }

    private cloudSave(relativePath: string, buffer: Buffer): Promise<void> {
        const { publicId, kind } = this.cloudRef(relativePath);
        return new Promise<void>((resolvePromise, reject) => {
            const uploader = cloudinary.uploader.upload_chunked_stream(
                {
                    public_id: publicId,
                    resource_type: kind,
                    type: 'authenticated',
                    overwrite: false,
                    unique_filename: false,
                    use_filename: false,
                    chunk_size: 20 * 1024 * 1024,
                },
                (error, result) => {
                    if (error || !result) reject(new Error(`Falha ao enviar para o Cloudinary: ${error?.message ?? 'sem resposta'}`));
                    else resolvePromise();
                },
            );
            uploader.end(buffer);
        });
    }

    private async cloudOpen(relativePath: string): Promise<StoredFile | null> {
        let ref;
        try {
            ref = this.cloudRef(relativePath);
        } catch {
            return null;
        }
        // Link assinado (só a API o gera): o arquivo é `authenticated` e não abre sem a assinatura.
        const url = cloudinary.url(ref.publicId, {
            resource_type: ref.kind,
            type: 'authenticated',
            format: ref.format,
            sign_url: true,
            secure: true,
        });

        const response = await fetch(url);
        if (response.status === 404) return null;
        if (!response.ok || !response.body) throw new Error(`Cloudinary respondeu ${response.status} ao ler o arquivo.`);

        const length = Number(response.headers.get('content-length'));
        if (length > 0 && !response.headers.get('content-encoding')) {
            return { stream: Readable.fromWeb(response.body as never), size: length };
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        return { stream: Readable.from(buffer), size: buffer.length };
    }

    private async cloudList(relativeDir: string): Promise<string[]> {
        const prefix = `${relativeDir.replace(/\\/g, '/').replace(/\/+$/, '')}/`;
        const names: string[] = [];
        for (const kind of KINDS) {
            let cursor: string | undefined;
            do {
                const page = await cloudinary.api.resources({
                    resource_type: kind,
                    type: 'authenticated',
                    prefix,
                    max_results: 500,
                    next_cursor: cursor,
                });
                for (const item of page.resources as Array<{ public_id: string; format?: string }>) {
                    const base = item.public_id.slice(prefix.length);
                    // só arquivos diretamente nesta pasta
                    if (item.format && base && !base.includes('/')) names.push(`${base}.${item.format}`);
                }
                cursor = page.next_cursor;
            } while (cursor);
        }
        return names;
    }

    private async cloudRemove(relativePath: string): Promise<void> {
        const { publicId, kind } = this.cloudRef(relativePath);
        await cloudinary.uploader.destroy(publicId, { resource_type: kind, type: 'authenticated', invalidate: true });
    }

    private async cloudRemoveDir(relativeDir: string): Promise<void> {
        const prefix = `${relativeDir.replace(/\\/g, '/').replace(/\/+$/, '')}/`;
        for (const kind of KINDS) {
            // O Cloudinary apaga em lotes: repete enquanto ele disser que sobrou arquivo (`partial`).
            for (let round = 0; round < 50; round++) {
                const result = await cloudinary.api.delete_resources_by_prefix(prefix, {
                    resource_type: kind,
                    type: 'authenticated',
                    invalidate: true,
                });
                if (!result?.partial) break;
            }
        }
    }

    // Garante que o caminho guardado no banco nunca escapa da pasta de áudios (modo disco).
    private get root(): string {
        return resolve(process.env.AUDIO_STORAGE_DIR || join(process.cwd(), 'storage', 'audio'));
    }

    private resolveSafe(relativePath: string): string {
        const target = resolve(this.root, relativePath);
        if (!target.startsWith(this.root + sep)) throw new Error('Invalid audio path');
        return target;
    }
}
