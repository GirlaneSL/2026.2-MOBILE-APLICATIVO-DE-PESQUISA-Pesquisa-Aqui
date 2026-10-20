import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { PrismaService } from '../prisma.service.js';
import { UserPayLoad } from '../auth/current-user.type.js';
import { ResearchService } from '../research/research.service.js';
import { QuestionRuleService } from '../question-rule/question-rule.service.js';
import { ReorderSectionsDto } from './dto/reorder-sections.dto.js';

@Injectable()
export class SectionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly researchService: ResearchService,
    private readonly ruleService: QuestionRuleService,
  ) { }

  async create(createSectionDto: CreateSectionDto, currentUser: UserPayLoad) {
    await this.researchService.assertEditable(createSectionDto.researchId, currentUser);

    return await this.prisma.client.orm.public.Section.create({
      title: createSectionDto.title,
      researchId: createSectionDto.researchId,
      order: createSectionDto.order,
    });
  }

  async findAll(researchId: number, currentUser: UserPayLoad) {
    await this.researchService.findOne(researchId, currentUser)
    return await this.prisma.client.orm.public.Section.where({ researchId }).all();
  }

  async findOne(id: number, currentUser: UserPayLoad) {
    const section = await this.prisma.client.orm.public.Section.where({ id }).first()

    if (!section) throw new NotFoundException('Section not found')

    await this.researchService.findOne(section.researchId, currentUser)

    return section;
  }

  async update(id: number, updateSectionDto: UpdateSectionDto, currentUser: UserPayLoad, force = false) {
    const section = await this.findOne(id, currentUser);
    await this.researchService.assertEditable(section.researchId, currentUser);

    // Mudar a ordem da seção não pode deixar regra apontando para trás.
    if (updateSectionDto.order !== undefined && updateSectionDto.order !== section.order) {
      await this.ruleService.applyOrderChange(
        section.researchId,
        { sectionOrders: new Map([[id, updateSectionDto.order]]) },
        force,
      );
    }

    return await this.prisma.client.orm.public.Section.where({ id }).update(updateSectionDto);
  }

  // Reordena todas as seções da pesquisa de uma vez, validando as regras no resultado final.
  async reorder(dto: ReorderSectionsDto, currentUser: UserPayLoad) {
    await this.researchService.assertEditable(dto.researchId, currentUser);
    const sections = await this.prisma.client.orm.public.Section.where({ researchId: dto.researchId }).all();

    const currentIds = sections.map((s) => s.id).sort((a, b) => a - b);
    const sentIds = [...dto.orderedIds].sort((a, b) => a - b);
    if (currentIds.length !== sentIds.length || currentIds.some((sId, i) => sId !== sentIds[i])) {
      throw new BadRequestException('A lista precisa conter exatamente as seções da pesquisa.');
    }

    await this.ruleService.applyOrderChange(
      dto.researchId,
      { sectionOrders: new Map(dto.orderedIds.map((sId, index) => [sId, index + 1])) },
      dto.force ?? false,
    );

    for (let index = 0; index < dto.orderedIds.length; index++) {
      await this.prisma.client.orm.public.Section.where({ id: dto.orderedIds[index] }).update({ order: index + 1 });
    }
    return { ok: true };
  }

  async delete(id: number, currentUser: UserPayLoad, force = false) {
    const section = await this.findOne(id, currentUser);
    await this.researchService.assertEditable(section.researchId, currentUser);

    const questions = await this.prisma.client.orm.public.Question.where({ sectionId: id }).all();
    const questionIds = questions.map((q) => q.id);

    if (questionIds.length > 0) {
      for (const qId of questionIds) {
        const answers = await this.prisma.client.orm.public.Answer.where({
          questionId: qId,
        }).all();

        if (answers && answers.length > 0) {
          throw new BadRequestException(
            'This section cannot be deleted because it contains questions that already have answers submitted by respondents.'
          );
        }
      }
    }

    // Avisa se alguma questão da seção é usada em regras; as regras saem junto (ON DELETE CASCADE).
    await this.ruleService.guardQuestionDeletion(section.researchId, questionIds, force, 'Questões desta seção participam');

    await this.prisma.client.orm.public.Question.where({ sectionId: id }).delete();

    return await this.prisma.client.orm.public.Section.where({ id }).delete();
  }
}
