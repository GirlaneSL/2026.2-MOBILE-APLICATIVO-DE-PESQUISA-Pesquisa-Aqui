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
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { CollectionSyncService } from './collection-sync.service.js';
import { CollectionService } from './collection.service.js';
import type { UploadedAudio } from './collection.service.js';
import { CreateCollectionDto } from './dto/create-collection.dto.js';
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

    // multipart/form-data: campo `payload` (JSON com respostas e consentimento) + arquivo `audio` opcional
    @Post()
    @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES, files: 1 } }))
    create(
        @Body() dto: CreateCollectionDto,
        @UploadedFile() audio: UploadedAudio | undefined,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.collectionService.create(dto.payload, audio, currentUser);
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

    @Get(':id/audio')
    @Header('Cache-Control', 'private, no-store')
    @Header('X-Content-Type-Options', 'nosniff')
    async audio(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        const { stream, size, mimeType } = await this.collectionService.getAudio(id, currentUser);
        return new StreamableFile(stream, { type: mimeType, length: size, disposition: 'inline' });
    }
}
