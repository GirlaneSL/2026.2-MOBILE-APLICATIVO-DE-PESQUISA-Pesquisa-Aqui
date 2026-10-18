import {
    Body,
    Controller,
    Get,
    Header,
    HttpCode,
    Param,
    ParseIntPipe,
    Post,
    Query,
    StreamableFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { CollectionSyncService } from './collection-sync.service.js';
import { CollectionService } from './collection.service.js';
import type { UploadedAudio } from './collection.service.js';
import { CreateCollectionDto, MAX_MEDIA_FILES } from './dto/create-collection.dto.js';
import { SyncCollectionsDto } from './dto/sync-collections.dto.js';

// Limite do arquivo de áudio por coleta (padrão 150 MB; ajustável por AUDIO_MAX_BYTES).
const MAX_AUDIO_BYTES = Number(process.env.AUDIO_MAX_BYTES) || 150 * 1024 * 1024;

@UseGuards(AuthGuard)
@Controller('collection')
export class CollectionController {
    constructor(
        private collectionService: CollectionService,
        private collectionSyncService: CollectionSyncService,
    ) { }

    // multipart/form-data: campo `payload` (JSON com respostas e consentimento) + arquivos opcionais:
    // `audio` (entrevista), `photos` (questões de foto) e `questionAudios` (questões de áudio).
    @Post()
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'audio', maxCount: 1 },
                { name: 'photos', maxCount: MAX_MEDIA_FILES },
                { name: 'questionAudios', maxCount: MAX_MEDIA_FILES },
            ],
            { limits: { fileSize: MAX_AUDIO_BYTES, files: 1 + 2 * MAX_MEDIA_FILES } },
        ),
    )
    create(
        @Body() dto: CreateCollectionDto,
        @UploadedFiles() files: { audio?: UploadedAudio[]; photos?: UploadedAudio[]; questionAudios?: UploadedAudio[] } | undefined,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.collectionService.create(dto.payload, files?.audio?.[0], currentUser, {
            photos: files?.photos ?? [],
            questionAudios: files?.questionAudios ?? [],
        });
    }

    // Sincronização offline: recebe um lote de coletas e responde, coleta por coleta, se foi aceita,
    // se já existia (mesmo UUID) ou por que foi recusada. Uma recusa nunca derruba o lote inteiro.
    @Post('sync')
    @HttpCode(200)
    sync(@Body() dto: SyncCollectionsDto, @CurrentUser() currentUser: UserPayLoad) {
        return this.collectionSyncService.sync(dto, currentUser);
    }

    @Get()
    findAll(@Query('researchId', ParseIntPipe) researchId: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.collectionService.findAll(researchId, currentUser);
    }

    // Uma coleta com todas as respostas (somente administrador da empresa da pesquisa).
    @Get(':id')
    @Header('Cache-Control', 'private, no-store')
    findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.collectionService.findOne(id, currentUser);
    }

    // Foto ou áudio de uma resposta, pelo nome devolvido em `files` na coleta aberta.
    @Get(':id/media/:name')
    @Header('Cache-Control', 'private, no-store')
    @Header('X-Content-Type-Options', 'nosniff')
    async media(
        @Param('id', ParseIntPipe) id: number,
        @Param('name') name: string,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        const { stream, size, mimeType } = await this.collectionService.getMedia(id, name, currentUser);
        return new StreamableFile(stream, { type: mimeType, length: size, disposition: 'inline' });
    }

    @Get(':id/audio')
    @Header('Cache-Control', 'private, no-store')
    @Header('X-Content-Type-Options', 'nosniff')
    async audio(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        const { stream, size, mimeType } = await this.collectionService.getAudio(id, currentUser);
        return new StreamableFile(stream, { type: mimeType, length: size, disposition: 'inline' });
    }
}
