import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { SectionService } from './section.service.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { ReorderSectionsDto } from './dto/reorder-sections.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';

@UseGuards(AuthGuard)
@Controller('section')
export class SectionController {
  constructor(private readonly sectionService: SectionService) { }

  @Post()
  create(@Body() createSectionDto: CreateSectionDto, @CurrentUser() currentUser: UserPayLoad) {
    return this.sectionService.create(createSectionDto, currentUser);
  }

  // Declarada antes das rotas com :id para nunca ser confundida com um id.
  @Post('reorder')
  reorder(@Body() reorderDto: ReorderSectionsDto, @CurrentUser() currentUser: UserPayLoad) {
    return this.sectionService.reorder(reorderDto, currentUser);
  }

  @Get()
  findAll(@Query('researchId', ParseIntPipe) researchId: number, @CurrentUser() currentUser: UserPayLoad) {
    return this.sectionService.findAll(researchId, currentUser);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
    return this.sectionService.findOne(id, currentUser);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSectionDto: UpdateSectionDto, @CurrentUser() CurrentUser: UserPayLoad, @Query('force') force?: string) {
    return this.sectionService.update(id, updateSectionDto, CurrentUser, force === 'true');
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad, @Query('force') force?: string) {
    return this.sectionService.delete(id, currentUser, force === 'true');
  }
}
