import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module.js';
import { AudioStorage } from './audio-storage.js';
import { PhotoStorage } from './photo-storage.js';
import { CollectionController } from './collection.controller.js';
import { CollectionService } from './collection.service.js';
import { CollectionFilesService } from './collection-files.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [CollectionController],
  providers: [CollectionService, CollectionFilesService, AudioStorage, PhotoStorage],
  exports: [CollectionService],
})
export class CollectionModule { }
