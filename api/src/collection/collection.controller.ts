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
import { CollectionFilesService } from './collection-files.service.js';
import { CreateCollectionDto } from './dto/create-collection.dto.js';
import { SyncCollectionsDto } from './dto/sync-collections.dto.js';
import { UploadCollectionFileDto } from './dto/upload-collection-file.dto.js';
import { maxAudioBytes, maxUploadBytes } from './file-limits.js';

@UseGuards(AuthGuard)
@Controller('collection')
export class CollectionController {
    constructor(
        
        private collectionService: CollectionService,
        private filesService: CollectionFilesService,
        private collectionSyncService: CollectionSyncService,
    ) { }

    // multipart/form-data: campo `payload` (JSON com respostas e consentimento) + arquivo `audio` opcional
    @Post()
    @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: maxAudioBytes(), files: 1 } }))
    create(
        @Body() dto: CreateCollectionDto,
        @UploadedFile() audio: UploadedAudio | undefined,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.collectionService.create(dto.payload, audio, currentUser);
    }

    // Envio de um arquivo (foto ou áudio) de uma coleta que já chegou.
    // multipart/form-data: `kind`, `questionId` e `fileName` (foto) + o arquivo no campo `file`.
    // O UUID da coleta (clientId) vai na rota.
    @Post(':clientId/files')
    @HttpCode(200)
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: maxUploadBytes(), files: 1 } }))
    uploadFile(
        @Param('clientId') clientId: string,
        @Body() dto: UploadCollectionFileDto,
        @UploadedFile() file: UploadedAudio | undefined,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        return this.filesService.upload(clientId, dto, file, currentUser);
    }

    // Sincronização offline: recebe um lote de coletas e responde, coleta por coleta, se foi aceita,
    // se já existia (mesmo UUID) ou por que foi recusada. Uma recusa nunca derruba o lote inteiro.
    @Post('sync')
    @HttpCode(200)
    sync(@Body() dto: SyncCollectionsDto, @CurrentUser() currentUser: UserPayLoad) {
        return this.collectionSyncService.sync(dto, currentUser);
    }

    @Get()
    async findAll(@Query('researchId', ParseIntPipe) researchId: number, @CurrentUser() currentUser: UserPayLoad) {
        const collections = await this.collectionService.findAll(researchId, currentUser);
        return this.filesService.attachFilesStatus(researchId, collections);
    }

    // Arquivos da coleta: quais chegaram e quais faltam.
    @Get(':id/files')
    files(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        return this.filesService.listFiles(id, currentUser);
    }

    @Get(':id/files/:fileId')
    @Header('Cache-Control', 'private, no-store')
    @Header('X-Content-Type-Options', 'nosniff')
    async file(
        @Param('id', ParseIntPipe) id: number,
        @Param('fileId', ParseIntPipe) fileId: number,
        @CurrentUser() currentUser: UserPayLoad,
    ) {
        const { stream, size, mimeType } = await this.filesService.openFile(id, fileId, currentUser);
        return new StreamableFile(stream, { type: mimeType, length: size, disposition: 'inline' });
    }

    @Get(':id/audio')
    @Header('Cache-Control', 'private, no-store')
    @Header('X-Content-Type-Options', 'nosniff')
    async audio(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
        // Áudio enviado separado tem prioridade; senão vale o áudio gravado no envio antigo da coleta.
        const received = await this.filesService.openReceivedAudio(id, currentUser);
        const { stream, size, mimeType } = received ?? (await this.collectionService.getAudio(id, currentUser));
        return new StreamableFile(stream, { type: mimeType, length: size, disposition: 'inline' });
    }
}
