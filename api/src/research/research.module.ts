import { Module } from '@nestjs/common';
import { ResearchController } from './research.controller.js';
import { ResearchService } from './research.service.js';
import { PrismaModule } from '../prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ResearchController],
  providers: [ResearchService]
})
export class ResearchModule { }
