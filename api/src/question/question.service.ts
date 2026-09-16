import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { PrismaService } from '../prisma.service.js';
import { UserPayLoad } from '../auth/current-user.type.js';
import { SectionService } from '../section/section.service.js';

@Injectable()
export class QuestionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly sectionService: SectionService,
  ) { }

  async create(createQuestionDto: CreateQuestionDto, currentUser: UserPayLoad) {
    await this.sectionService.findOne(createQuestionDto.sectionId, currentUser);

    return await this.prisma.client.orm.public.Question.create({
      statement: createQuestionDto.statement,
      type: createQuestionDto.type,
      helpText: createQuestionDto.helpText,
      isRequired: createQuestionDto.isRequired,
      order: createQuestionDto.order,
      sectionId: createQuestionDto.sectionId,
      minSelections: createQuestionDto.minSelections,
      maxSelections: createQuestionDto.maxSelections,
      minValue: createQuestionDto.minValue,
      maxValue: createQuestionDto.maxValue,
      minDate: createQuestionDto.minDate,
      maxDate: createQuestionDto.maxDate,
      maxLength: createQuestionDto.maxLength,
      scaleLeftLabel: createQuestionDto.scaleLeftLabel,
      scaleRightLabel: createQuestionDto.scaleRightLabel,
      maxFiles: createQuestionDto.maxFiles,
      maxDuration: createQuestionDto.maxDuration,
    });
  }

  async findAll(sectionId: number, currentUser: UserPayLoad) {
    await this.sectionService.findOne(sectionId, currentUser)
    return await this.prisma.client.orm.public.Question.where({ sectionId }).all();
  }

  async findOne(id: number, currentUser: UserPayLoad) {
    const question = await this.prisma.client.orm.public.Question.where({ id }).first()
    if (!question) throw new NotFoundException('Question not found')
    await this.sectionService.findOne(question.sectionId, currentUser)
    return question;
  }

  async update(id: number, updateQuestionDto: UpdateQuestionDto, currentUser: UserPayLoad) {
    await this.findOne(id, currentUser);
    return await this.prisma.client.orm.public.Question.where({ id }).update(updateQuestionDto);
  }

  async delete(id: number, currentUser: UserPayLoad) {
    await this.findOne(id, currentUser);
    try {
      return await this.prisma.client.orm.public.Question.where({ id }).delete();
    } catch (error: any) {
      if (error?.sqlState === '23503' || error?.code === '23503' || error?.message?.includes('answer_questionId_fkey')) {
        throw new BadRequestException('This question cannot be deleted because it already has answers submitted by respondents.');
      }
      throw error;
    }
  }

  // --- GERENCIAMENTO DE OPÇÕES DE RESPOSTA ---
  async createOption(questionId: number, text: string, order: number) {
    return await this.prisma.client.orm.public.QuestionOption.create({
      questionId,
      text,
      order,
    });
  }

  async getOptions(questionId: number) {
    return await this.prisma.client.orm.public.QuestionOption.where({ questionId }).all();
  }

  async updateOption(id: number, text?: string, order?: number) {
    const data: any = {};
    if (text !== undefined) data.text = text;
    if (order !== undefined) data.order = order;
    return await this.prisma.client.orm.public.QuestionOption.where({ id }).update(data);
  }

  async deleteOption(id: number) {
    return await this.prisma.client.orm.public.QuestionOption.where({ id }).delete();
  }
}