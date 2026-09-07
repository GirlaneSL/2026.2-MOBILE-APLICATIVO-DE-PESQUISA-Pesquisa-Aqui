import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { SectionService } from './section.service.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
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

  @Get()
  findAll(@Query('researchId', ParseIntPipe) researchId: number, @CurrentUser() currentUser: UserPayLoad) {
    return this.sectionService.findAll(researchId, currentUser);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
    return this.sectionService.findOne(id, currentUser);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSectionDto: UpdateSectionDto, @CurrentUser() CurrentUser: UserPayLoad) {
    return this.sectionService.update(id, updateSectionDto, CurrentUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sectionService.remove(+id);
  }
}
