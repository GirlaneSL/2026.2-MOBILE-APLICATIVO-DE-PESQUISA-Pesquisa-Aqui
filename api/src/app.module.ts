import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { CompanyModule } from './company/company.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { ResearchModule } from './research/research.module.js';
import { SectionModule } from './section/section.module.js';
import { QuestionModule } from './question/question.module.js';
import { QuestionRuleModule } from './question-rule/question-rule.module.js';
import { CollectionModule } from './collection/collection.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { MediaModule } from './media/media.module.js';
import { MediaUrlInterceptor } from './media/media-url.interceptor.js';

@Module({
  imports: [CompanyModule, AuthModule, UserModule, ResearchModule, SectionModule, QuestionModule, QuestionRuleModule, CollectionModule, DashboardModule, MediaModule],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    // Troca o endereço do Cloudinary das imagens por um caminho /media da própria API em todas as respostas.
    { provide: APP_INTERCEPTOR, useClass: MediaUrlInterceptor },
  ],
})
export class AppModule { }
