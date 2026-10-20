import { Module } from '@nestjs/common';
import { ResearchController } from './research.controller.js';
import { ResearchService } from './research.service.js';
import { PrismaModule } from '../prisma.module.js';
import { StorageModule } from '../collection/storage.module.js';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule { }
