import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    PayloadTooLargeException,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { AudioStorage, audioExtensionFor } from './audio-storage.js';
import { PhotoStorage, matchesImageSignature, photoExtensionFor } from './photo-storage.js';
import { formatLimit, maxAudioBytes, maxPhotoBytes } from './file-limits.js';
import type { UploadedAudio } from './collection.service.js';
import type { UploadCollectionFileDto } from './dto/upload-collection-file.dto.js';

type FileKindName = 'PHOTO' | 'AUDIO';

interface CollectionRow {
    id: number;
    researchId: number;
    researcherId: number;
    consentGiven: boolean;
    audioPath: string | null;
    audioMimeType: string | null;
    audioSizeBytes: number | null;
    audioDurationSeconds: number | null;
}

// Um arquivo que a coleta deve ter: já chegou ou ainda falta.
export interface FileEntry {
    kind: FileKindName;
    questionId: number | null;
    fileName: string;
    received: boolean;
    fileId: number | null;
    mimeType: string | null;
    sizeBytes: number | null;
}

export interface FilesCounts {
    expected: number;
    received: number;
    missing: number;
}

// Corpo de erro com código, para o app decidir se reenvia ou desiste.
const refusal = (statusCode: number, code: string, message: string) => ({ statusCode, code, message });

// Resposta de foto única guarda o nome; várias fotos guardam uma lista JSON de nomes.
function parsePhotoNames(value: string): string[] {
    const text = value.trim();
    if (!text) return [];
    if (text.startsWith('[')) {
        try {
            const parsed: unknown = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return parsed.filter((name): name is string => typeof name === 'string' && name.length > 0);
            }
        } catch {
            // lista malformada: nenhum arquivo esperado dessa resposta
        }
        return [];
    }
    return [text];
}

const photoKey = (collectionId: number, questionId: number, fileName: string) =>
    `${collectionId}:PHOTO:${questionId}:${fileName}`;
const audioKey = (collectionId: number) => `${collectionId}:AUDIO`;

@Injectable()
export class CollectionFilesService {
    constructor(
        private prisma: PrismaService,
        private photoStorage: PhotoStorage,
        private audioStorage: AudioStorage,
    ) { }

    // Recebe um arquivo (foto ou áudio) de uma coleta que já chegou ao servidor.
    // Idempotente: o mesmo arquivo enviado de novo é reconhecido e não é gravado outra vez.
    async upload(
        clientId: string,
        dto: UploadCollectionFileDto,
        file: UploadedAudio | undefined,
        currentUser: UserPayLoad,
    ) {
        if (currentUser.profile !== 'RESEARCHER') {
            throw new ForbiddenException('Somente pesquisadores enviam arquivos.');
        }
        if (!file || !file.buffer || file.buffer.length === 0) {
            throw new BadRequestException(refusal(400, 'FILE_EMPTY', 'O arquivo não foi anexado ou está vazio.'));
        }

        const orm = this.prisma.client.orm.public;

        // No token, `sub` é o username (não o id numérico)
        const user = await orm.User.where({ username: String(currentUser.sub) }).first();
        if (!user) throw new ForbiddenException('Usuário não encontrado.');

        // A coleta precisa ter chegado antes, e ser deste pesquisador.
        const collection = await orm.Collection.where({ researcherId: user.id, clientId }).first();
        if (!collection) {
            throw new NotFoundException(
                refusal(404, 'COLLECTION_NOT_RECEIVED', 'Esta coleta ainda não chegou ao servidor. Envie a coleta antes dos arquivos.'),
            );
        }

        const research = await orm.Research.where({ id: collection.researchId }).first();
        if (!research) throw new NotFoundException(refusal(404, 'RESEARCH_NOT_FOUND', 'Pesquisa não encontrada.'));

        const kind: FileKindName = dto.kind;
        let questionId: number | null = null;
        let fileName = 'audio';
        let fileKey = audioKey(collection.id);

        if (kind === 'PHOTO') {
            questionId = dto.questionId as number;
            fileName = dto.fileName as string;

            // A foto precisa estar declarada nas respostas da coleta, naquela questão.
            const expected = await this.expectedPhotos(collection.id, research.id);
            const known = expected.some((e) => e.questionId === questionId && e.fileName === fileName);
            if (!known) {
                throw new UnprocessableEntityException(
                    refusal(422, 'FILE_NOT_EXPECTED', `A coleta não tem a foto "${fileName}" na questão ${questionId}.`),
                );
            }
            fileKey = photoKey(collection.id, questionId, fileName);
        } else if (!collection.consentGiven || !research.recordInterview) {
            throw new UnprocessableEntityException(
                refusal(422, 'AUDIO_NOT_ALLOWED', 'Esta coleta não tem gravação autorizada: o áudio foi recusado.'),
            );
        }

        // Já recebido: reconhece sem gravar de novo (vale antes de validar tipo e tamanho).
        const existing = await orm.CollectionFile.where({ fileKey }).first();
        if (existing || (kind === 'AUDIO' && collection.audioPath !== null)) {
            return this.receipt('ALREADY_RECEIVED', existing?.id ?? null, kind, questionId, fileName, collection);
        }

        const extension = this.validateFile(kind, file);

        const storagePath =
            kind === 'PHOTO'
                ? await this.photoStorage.save(research.id, file.buffer, extension)
                : await this.audioStorage.save(research.id, file.buffer, extension);

        let record;
        try {
            record = await orm.CollectionFile.create({
                collectionId: collection.id,
                kind,
                questionId,
                fileName,
                fileKey,
                mimeType: file.mimetype.toLowerCase().split(';')[0].trim(),
                sizeBytes: file.buffer.length,
                storagePath,
            });
        } catch (error) {
            await this.removeStored(kind, storagePath).catch(() => undefined);
            // Dois envios do mesmo arquivo ao mesmo tempo: a chave única barra o segundo.
            const raced = await orm.CollectionFile.where({ fileKey }).first();
            if (raced) return this.receipt('ALREADY_RECEIVED', raced.id, kind, questionId, fileName, collection);
            throw error;
        }

        return this.receipt('RECEIVED', record.id, kind, questionId, fileName, collection);
    }

    // Arquivos da coleta: os que já chegaram e os que faltam. Só admin da empresa da pesquisa.
    async listFiles(collectionId: number, currentUser: UserPayLoad) {
        const orm = this.prisma.client.orm.public;
        const collection = await orm.Collection.where({ id: collectionId }).first();
        if (!collection) throw new NotFoundException('Coleta não encontrada.');

        const research = await orm.Research.where({ id: collection.researchId }).first();
        this.assertCompanyAdmin(research, currentUser);

        const types = await this.loadQuestionTypes(collection.researchId);
        const files = await this.buildEntries(collection, types);
        return { collectionId, ...this.counts(files), files };
    }

    // Abre um arquivo (foto ou áudio) da coleta. Só admin da empresa dona da pesquisa chega aqui.
    async openFile(collectionId: number, fileId: number, currentUser: UserPayLoad) {
        const orm = this.prisma.client.orm.public;
        const file = await orm.CollectionFile.where({ id: fileId }).first();
        if (!file || file.collectionId !== collectionId) throw new NotFoundException('Arquivo não encontrado.');

        const collection = await orm.Collection.where({ id: collectionId }).first();
        if (!collection) throw new NotFoundException('Coleta não encontrada.');
        const research = await orm.Research.where({ id: collection.researchId }).first();
        this.assertCompanyAdmin(research, currentUser);

        const opened =
            file.kind === 'PHOTO'
                ? await this.photoStorage.open(file.storagePath)
                : await this.audioStorage.open(file.storagePath);
        if (!opened) throw new NotFoundException('O arquivo desta coleta não foi encontrado.');

        return { ...opened, mimeType: file.mimeType };
    }

    // Áudio que subiu pelo envio separado. Devolve null se a coleta não tem um (aí vale o fluxo antigo).
    async openReceivedAudio(collectionId: number, currentUser: UserPayLoad) {
        const orm = this.prisma.client.orm.public;
        const audio = await orm.CollectionFile.where({ collectionId, kind: 'AUDIO' }).first();
        if (!audio) return null;
        return this.openFile(collectionId, audio.id, currentUser);
    }

    // Acrescenta a cada coleta da lista quantos arquivos chegaram e quantos faltam.
    async attachFilesStatus<T extends { id: number; hasAudio: boolean }>(researchId: number, summaries: T[]) {
        const orm = this.prisma.client.orm.public;
        const collections = await orm.Collection.where({ researchId }).all();
        const byId = new Map(collections.map((c) => [c.id, c]));
        const types = await this.loadQuestionTypes(researchId);

        return Promise.all(
            summaries.map(async (summary) => {
                const collection = byId.get(summary.id);
                if (!collection) return { ...summary, files: { expected: 0, received: 0, missing: 0 } };

                const entries = await this.buildEntries(collection, types);
                const audio = entries.find((e) => e.kind === 'AUDIO');
                return {
                    ...summary,
                    hasAudio: summary.hasAudio || (audio?.received ?? false),
                    files: this.counts(entries),
                };
            }),
        );
    }

    // ---------------------------------------------------------------------------------------

    private validateFile(kind: FileKindName, file: UploadedAudio): string {
        if (kind === 'PHOTO') {
            const extension = photoExtensionFor(file.mimetype);
            if (!extension) {
                throw new UnsupportedMediaTypeException(
                    refusal(415, 'FILE_TYPE_NOT_ALLOWED', 'Tipo de foto não aceito. Use JPEG, PNG ou WebP.'),
                );
            }
            if (file.buffer.length > maxPhotoBytes()) {
                throw new PayloadTooLargeException(
                    refusal(413, 'FILE_TOO_LARGE', `A foto passa do limite de ${formatLimit(maxPhotoBytes())}.`),
                );
            }
            if (!matchesImageSignature(file.buffer, extension)) {
                throw new UnsupportedMediaTypeException(
                    refusal(415, 'FILE_TYPE_NOT_ALLOWED', 'O conteúdo do arquivo não é uma imagem válida.'),
                );
            }
            return extension;
        }

        const extension = audioExtensionFor(file.mimetype);
        if (!extension) {
            throw new UnsupportedMediaTypeException(
                refusal(415, 'FILE_TYPE_NOT_ALLOWED', 'Formato de áudio não suportado.'),
            );
        }
        if (file.buffer.length > maxAudioBytes()) {
            throw new PayloadTooLargeException(
                refusal(413, 'FILE_TOO_LARGE', `O áudio passa do limite de ${formatLimit(maxAudioBytes())}.`),
            );
        }
        return extension;
    }

    private async removeStored(kind: FileKindName, storagePath: string) {
        if (kind === 'PHOTO') await this.photoStorage.remove(storagePath);
        else await this.audioStorage.remove(storagePath);
    }

    private async receipt(
        status: 'RECEIVED' | 'ALREADY_RECEIVED',
        fileId: number | null,
        kind: FileKindName,
        questionId: number | null,
        fileName: string,
        collection: CollectionRow,
    ) {
        const types = await this.loadQuestionTypes(collection.researchId);
        const entries = await this.buildEntries(collection, types);
        return { status, fileId, kind, questionId, fileName, files: this.counts(entries) };
    }

    private counts(entries: FileEntry[]): FilesCounts {
        const received = entries.filter((e) => e.received).length;
        return { expected: entries.length, received, missing: entries.length - received };
    }

    private async loadQuestionTypes(researchId: number): Promise<Map<number, string>> {
        const orm = this.prisma.client.orm.public;
        const types = new Map<number, string>();
        const sections = await orm.Section.where({ researchId }).all();
        for (const section of sections) {
            for (const question of await orm.Question.where({ sectionId: section.id }).all()) {
                types.set(question.id, question.type);
            }
        }
        return types;
    }

    // Fotos que a coleta declara nas respostas das questões de foto.
    private async expectedPhotos(collectionId: number, researchId: number) {
        const types = await this.loadQuestionTypes(researchId);
        return this.expectedPhotosFrom(collectionId, types);
    }

    private async expectedPhotosFrom(collectionId: number, types: Map<number, string>) {
        const orm = this.prisma.client.orm.public;
        const answers = await orm.Answer.where({ collectionId }).all();
        const seen = new Set<string>();
        const photos: { questionId: number; fileName: string }[] = [];

        for (const answer of answers) {
            const type = types.get(answer.questionId);
            if (type !== 'PHOTO' && type !== 'MULTIPLE_PHOTOS') continue;
            for (const fileName of parsePhotoNames(answer.value)) {
                const key = `${answer.questionId}:${fileName}`;
                if (seen.has(key)) continue;
                seen.add(key);
                photos.push({ questionId: answer.questionId, fileName });
            }
        }
        return photos;
    }

    private async buildEntries(collection: CollectionRow, types: Map<number, string>): Promise<FileEntry[]> {
        const orm = this.prisma.client.orm.public;
        const files = await orm.CollectionFile.where({ collectionId: collection.id }).all();
        const byKey = new Map(files.map((f) => [f.fileKey, f]));

        const entries: FileEntry[] = [];

        for (const photo of await this.expectedPhotosFrom(collection.id, types)) {
            const stored = byKey.get(photoKey(collection.id, photo.questionId, photo.fileName));
            entries.push({
                kind: 'PHOTO',
                questionId: photo.questionId,
                fileName: photo.fileName,
                received: !!stored,
                fileId: stored?.id ?? null,
                mimeType: stored?.mimeType ?? null,
                sizeBytes: stored?.sizeBytes ?? null,
            });
        }

        // Áudio esperado: a coleta declarou uma duração, ou ele já chegou (envio separado ou fluxo antigo).
        const audioFile = byKey.get(audioKey(collection.id));
        const legacyAudio = collection.audioPath !== null;
        if (audioFile || legacyAudio || collection.audioDurationSeconds !== null) {
            entries.push({
                kind: 'AUDIO',
                questionId: null,
                fileName: 'audio',
                received: !!audioFile || legacyAudio,
                fileId: audioFile?.id ?? null,
                mimeType: audioFile?.mimeType ?? collection.audioMimeType,
                sizeBytes: audioFile?.sizeBytes ?? collection.audioSizeBytes,
            });
        }

        return entries;
    }

    // Foto e áudio são dado pessoal: só administrador da empresa da pesquisa acessa.
    private assertCompanyAdmin(research: { companyId: number } | null | undefined, currentUser: UserPayLoad) {
        if (
            !research ||
            currentUser.profile !== 'ADMINISTRATOR' ||
            !currentUser.companyId ||
            research.companyId !== currentUser.companyId
        ) {
            throw new ForbiddenException('Acesso negado: somente administradores da empresa desta pesquisa acessam os arquivos das coletas.');
        }
    }
}
