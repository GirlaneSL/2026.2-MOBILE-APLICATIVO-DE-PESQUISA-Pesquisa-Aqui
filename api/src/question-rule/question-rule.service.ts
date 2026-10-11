import { ConflictException, Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { ResearchService } from '../research/research.service.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { CreateQuestionRuleDto } from './dto/create-question-rule.dto.js';
import {
  checkNewRule,
  findOutOfOrderRules,
  findRulesWithInvalidTrigger,
  questionLabel,
  triggerLabel,
  type RuleEdge,
  type StructQuestion,
} from './rule-logic.js';

export interface RuleView {
  id: number;
  researchId: number;
  sourceQuestionId: number;
  sourceLabel: string;
  sourceStatement: string;
  triggerValue: string;
  triggerLabel: string;
  targetQuestionId: number;
  targetLabel: string;
  targetStatement: string;
}

// Mudanças hipotéticas de ordem, para validar ANTES de gravar.
export interface OrderOverrides {
  questionOrders?: Map<number, { order: number; sectionId?: number }>;
  sectionOrders?: Map<number, number>;
}

@Injectable()
export class QuestionRuleService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly researchService: ResearchService,
  ) { }

  private get orm() {
    return this.prisma.client.orm.public;
  }

  // ---------- leitura da estrutura ----------

  /** Todas as questões da pesquisa, já com a ordem das seções, e as regras. */
  private async load(researchId: number, overrides: OrderOverrides = {}) {
    const sections = await this.orm.Section.where({ researchId }).all();
    const sectionOrderOf = new Map<number, number>(
      sections.map((s) => [s.id, overrides.sectionOrders?.get(s.id) ?? s.order]),
    );

    const questions: StructQuestion[] = [];
    await Promise.all(
      sections.map(async (section) => {
        const rows = await this.orm.Question.where({ sectionId: section.id }).all();
        await Promise.all(
          rows.map(async (q) => {
            const isChoice = q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE';
            const options = isChoice ? await this.orm.QuestionOption.where({ questionId: q.id }).all() : [];
            const override = overrides.questionOrders?.get(q.id);
            const sectionId = override?.sectionId ?? q.sectionId;
            questions.push({
              id: q.id,
              sectionId,
              sectionOrder: sectionOrderOf.get(sectionId) ?? section.order,
              order: override?.order ?? q.order,
              statement: q.statement,
              type: q.type,
              options: options.map((o) => ({ id: o.id, text: o.text })),
            });
          }),
        );
      }),
    );

    const rules = await this.orm.QuestionRule.where({ researchId }).all();
    const edges: RuleEdge[] = rules.map((r) => ({
      id: r.id,
      sourceQuestionId: r.sourceQuestionId,
      targetQuestionId: r.targetQuestionId,
      triggerValue: r.triggerValue,
    }));

    return { questions, edges };
  }

  private toView(researchId: number, edge: RuleEdge, questions: StructQuestion[]): RuleView {
    const source = questions.find((q) => q.id === edge.sourceQuestionId);
    const target = questions.find((q) => q.id === edge.targetQuestionId);
    return {
      id: edge.id,
      researchId,
      sourceQuestionId: edge.sourceQuestionId,
      sourceLabel: source ? questionLabel(source) : `Questão ${edge.sourceQuestionId}`,
      sourceStatement: source?.statement ?? '',
      triggerValue: edge.triggerValue,
      triggerLabel: triggerLabel(source, edge.triggerValue),
      targetQuestionId: edge.targetQuestionId,
      targetLabel: target ? questionLabel(target) : `Questão ${edge.targetQuestionId}`,
      targetStatement: target?.statement ?? '',
    };
  }

  private conflict(message: string, views: RuleView[]) {
    return new ConflictException({ statusCode: 409, code: 'RULES_CONFLICT', message, rules: views });
  }

  // ---------- CRUD ----------

  async create(dto: CreateQuestionRuleDto, currentUser: UserPayLoad) {
    const [source, target] = await Promise.all([
      this.orm.Question.where({ id: dto.sourceQuestionId }).first(),
      this.orm.Question.where({ id: dto.targetQuestionId }).first(),
    ]);
    if (!source || !target) throw new NotFoundException('Question not found');

    const [sourceSection, targetSection] = await Promise.all([
      this.orm.Section.where({ id: source.sectionId }).first(),
      this.orm.Section.where({ id: target.sectionId }).first(),
    ]);
    if (!sourceSection || !targetSection) throw new NotFoundException('Section not found');

    if (sourceSection.researchId !== targetSection.researchId) {
      throw new BadRequestException('As duas questões da regra precisam pertencer à mesma pesquisa.');
    }
    const researchId = sourceSection.researchId;
    await this.researchService.findOne(researchId, currentUser);

    const { questions, edges } = await this.load(researchId);
    const error = checkNewRule(questions, edges, dto);
    if (error) throw new BadRequestException(error);

    const created = await this.orm.QuestionRule.create({
      researchId,
      sourceQuestionId: dto.sourceQuestionId,
      triggerValue: dto.triggerValue,
      targetQuestionId: dto.targetQuestionId,
    });

    return this.toView(researchId, { ...dto, id: created.id }, questions);
  }

  async findAll(researchId: number, currentUser: UserPayLoad): Promise<RuleView[]> {
    await this.researchService.findOne(researchId, currentUser);
    const { questions, edges } = await this.load(researchId);
    return edges.map((e) => this.toView(researchId, e, questions));
  }

  async delete(id: number, currentUser: UserPayLoad) {
    const rule = await this.orm.QuestionRule.where({ id }).first();
    if (!rule) throw new NotFoundException('Rule not found');
    await this.researchService.findOne(rule.researchId, currentUser);
    return await this.orm.QuestionRule.where({ id }).delete();
  }

  // ---------- proteções usadas por question/section ----------

  /**
   * Antes de excluir questões: se alguma participa de regra, avisa (409) e só
   * segue com force. A exclusão da regra em si fica por conta do ON DELETE CASCADE,
   * assim, se a exclusão da questão falhar, a regra continua intacta.
   */
  async guardQuestionDeletion(researchId: number, questionIds: number[], force: boolean, subject: string) {
    if (questionIds.length === 0) return;
    const { questions, edges } = await this.load(researchId);
    const ids = new Set(questionIds);
    const affected = edges.filter((e) => ids.has(e.sourceQuestionId) || ids.has(e.targetQuestionId));
    if (affected.length === 0 || force) return;

    throw this.conflict(
      `${subject} de ${affected.length} regra(s) de exibição. Excluir apaga também essas regras.`,
      affected.map((e) => this.toView(researchId, e, questions)),
    );
  }

  /**
   * Antes de mudar a ordem de questões/seções: se alguma regra passaria a apontar
   * para uma questão anterior, avisa (409). Com force, apaga essas regras.
   */
  async applyOrderChange(researchId: number, overrides: OrderOverrides, force: boolean) {
    const { questions, edges } = await this.load(researchId, overrides);
    const broken = findOutOfOrderRules(questions, edges);
    if (broken.length === 0) return;

    if (!force) {
      throw this.conflict(
        `Essa mudança de ordem deixaria ${broken.length} regra(s) de exibição apontando para uma questão anterior. Elas serão apagadas se você continuar.`,
        broken.map((e) => this.toView(researchId, e, questions)),
      );
    }
    await Promise.all(broken.map((e) => this.orm.QuestionRule.where({ id: e.id }).delete()));
  }

  /** Antes de excluir uma opção: regras que disparam por ela ficariam órfãs. */
  async guardOptionDeletion(researchId: number, questionId: number, optionId: number, force: boolean) {
    const { questions, edges } = await this.load(researchId);
    const affected = edges.filter(
      (e) => e.sourceQuestionId === questionId && e.triggerValue === String(optionId),
    );
    if (affected.length === 0) return;

    if (!force) {
      throw this.conflict(
        `Essa opção dispara ${affected.length} regra(s) de exibição. Excluí-la apaga também essas regras.`,
        affected.map((e) => this.toView(researchId, e, questions)),
      );
    }
    await Promise.all(affected.map((e) => this.orm.QuestionRule.where({ id: e.id }).delete()));
  }

  /** Antes de trocar o tipo: regras cuja resposta deixa de fazer sentido. */
  async guardTypeChange(researchId: number, questionId: number, newType: string, force: boolean) {
    const { questions, edges } = await this.load(researchId);
    const current = questions.find((q) => q.id === questionId);
    if (!current) return;

    const broken = findRulesWithInvalidTrigger({ ...current, type: newType }, edges);
    if (broken.length === 0) return;

    if (!force) {
      throw this.conflict(
        `Mudar o tipo desta questão invalida ${broken.length} regra(s) de exibição que dependem da resposta dela. Elas serão apagadas se você continuar.`,
        broken.map((e) => this.toView(researchId, e, questions)),
      );
    }
    await Promise.all(broken.map((e) => this.orm.QuestionRule.where({ id: e.id }).delete()));
  }
}
