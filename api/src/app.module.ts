import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { CompanyModule } from './company/company.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { ResearchModule } from './research/research.module.js';
import { SectionModule } from './section/section.module.js';
import { QuestionModule } from './question/question.module.js';

@Module({
  imports: [CompanyModule, AuthModule, UserModule, ResearchModule, SectionModule, QuestionModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
