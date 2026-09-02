import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { CompanyModule } from './company/company.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { ResearchModule } from './research/research.module.js';

@Module({
  imports: [CompanyModule, AuthModule, UserModule, ResearchModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
