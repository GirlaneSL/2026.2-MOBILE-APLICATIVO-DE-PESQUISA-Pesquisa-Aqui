import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module.js';
import { ResearchService } from '../research/research.service.js';
import { QuestionRuleController } from './question-rule.controller.js';
import { QuestionRuleService } from './question-rule.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [QuestionRuleController],
  providers: [QuestionRuleService, ResearchService],
  exports: [QuestionRuleService],
})
export class QuestionRuleModule { }
