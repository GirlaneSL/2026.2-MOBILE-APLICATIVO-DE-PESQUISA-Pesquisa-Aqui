import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { CompanyModule } from './company/company.module.js';

@Module({
  imports: [CompanyModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
