import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { QuestionService } from './question.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { AuthGuard } from '../auth/auth.guard.js';

@UseGuards(AuthGuard)
@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) { }

  @Post()
  create(@Body() createQuestionDto: CreateQuestionDto, @CurrentUser() currentUser: UserPayLoad) {
    return this.questionService.create(createQuestionDto, currentUser);
  }

  @Get()
  findAll(@Query('sectionId', ParseIntPipe) sectionId: number, @CurrentUser() currentUser: UserPayLoad) {
    return this.questionService.findAll(sectionId, currentUser);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
    return this.questionService.findOne(id, currentUser);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateQuestionDto: UpdateQuestionDto, @CurrentUser() currentUser: UserPayLoad) {
    return this.questionService.update(id, updateQuestionDto, currentUser);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: UserPayLoad) {
    return this.questionService.delete(id, currentUser);
  }

  @Post(':id/option')
  createOption(@Param('id') id: string, @Body() body: { text: string; order: number }) {
    return this.questionService.createOption(+id, body.text, body.order);
  }

  @Get(':id/options')
  getOptions(@Param('id') id: string) {
    return this.questionService.getOptions(+id);
  }

  @Patch('option/:id')
  updateOption(@Param('id') id: string, @Body() body: { text?: string; order?: number }) {
    return this.questionService.updateOption(+id, body.text, body.order);
  }

  @Delete('option/:id')
  deleteOption(@Param('id') id: string) {
    return this.questionService.deleteOption(+id);
  }

}
