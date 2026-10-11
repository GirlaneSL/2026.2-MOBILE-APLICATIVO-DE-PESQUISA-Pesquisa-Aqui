import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module.js';
import { AudioStorage } from './audio-storage.js';
import { CollectionSyncService } from './collection-sync.service.js';
import { CollectionController } from './collection.controller.js';
import { CollectionService } from './collection.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [CollectionController],
  providers: [CollectionService, CollectionSyncService, AudioStorage],
  exports: [CollectionService],
})
export class CollectionModule { }
