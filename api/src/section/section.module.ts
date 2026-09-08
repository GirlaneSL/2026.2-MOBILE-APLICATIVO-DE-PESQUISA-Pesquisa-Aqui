import { Module } from '@nestjs/common';
import { SectionService } from './section.service.js';
import { SectionController } from './section.controller.js';
import { PrismaModule } from '../prisma.module.js';
import { ResearchService } from '../research/research.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [SectionController],
  providers: [SectionService, ResearchService],
  exports: [SectionService],
})
export class SectionModule { }
