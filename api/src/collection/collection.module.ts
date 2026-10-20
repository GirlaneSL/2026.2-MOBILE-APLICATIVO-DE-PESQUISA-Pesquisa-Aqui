import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module.js';
import { CollectionSyncService } from './collection-sync.service.js';
import { CollectionController } from './collection.controller.js';
import { CollectionService } from './collection.service.js';
import { StorageModule } from './storage.module.js';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [CollectionController],
  providers: [CollectionService, CollectionSyncService],
  exports: [CollectionService],
})
export class CollectionModule { }
