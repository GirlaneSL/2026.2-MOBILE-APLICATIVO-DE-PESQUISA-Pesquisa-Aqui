import { Module } from '@nestjs/common';
import { QuestionService } from './question.service.js';
import { QuestionController } from './question.controller.js';
import { PrismaModule } from '../prisma.module.js';
import { SectionModule } from '../section/section.module.js';

@Module({
  imports: [PrismaModule, SectionModule],
  controllers: [QuestionController],
  providers: [QuestionService],
})
export class QuestionModule { }
