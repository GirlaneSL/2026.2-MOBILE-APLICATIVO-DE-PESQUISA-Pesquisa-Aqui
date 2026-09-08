import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
}
