import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import {
    buildCharts,
    buildCsv,
    buildPanel,
    filterCollections,
    type ReportAnswer,
    type ReportCollection,
    type ReportFilter,
    type ReportQuestion,
    type ReportResearcher,
} from './research-report.js';

export interface ReportQuery {
    from?: string;
    to?: string;
    researcherId?: number;
}

/** Aceita ISO completo (o navegador manda o dia no fuso local) ou só a data (AAAA-MM-DD, início/fim do dia em UTC). */
function parseBound(raw: string | undefined, edge: 'start' | 'end'): Date | undefined {
    if (!raw) return undefined;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    const date = new Date(dateOnly ? `${raw}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}Z` : raw);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Data inválida: ${raw}`);
    return date;
}

@Injectable()
export class ResearchReportService {
    constructor(private prisma: PrismaService) { }

    /**
     * Pesquisa da empresa de quem está logado. Painel, relatório e exportação mostram coletas e respostas de
     * pessoas: só o administrador da empresa da pesquisa (a mesma regra da lista de coletas). A empresa vem do
     * token e é conferida contra a pesquisa; nenhuma consulta abaixo parte de um id vindo da requisição sem
     * passar por ela.
     */
    private async loadResearch(researchId: number, currentUser: UserPayLoad) {
        const orm = this.prisma.client.orm.public;
        const research = await orm.Research.where({ id: researchId }).first();
        if (
            !research ||
            currentUser.profile !== 'ADMINISTRATOR' ||
            !currentUser.companyId ||
            research.companyId !== currentUser.companyId
        ) {
            throw new ForbiddenException('Acesso negado: somente administradores da empresa desta pesquisa acessam o painel e o relatório.');
        }
        return research;
    }

    private async loadData(research: { id: number; companyId: number }, query: ReportQuery) {
        const orm = this.prisma.client.orm.public;

        const from = parseBound(query.from, 'start');
        const to = parseBound(query.to, 'end');
        if (from && to && to < from) throw new BadRequestException('O fim do período não pode ser anterior ao início.');

        const allCollections = (await orm.Collection.where({ researchId: research.id }).all()) as ReportCollection[];
        const links = await orm.ResearchResearcher.where({ researchId: research.id }).all();

        // Pesquisadores: os vinculados + quem entregou coleta e foi desvinculado depois (a coleta continua na pesquisa).
        const ids = [...new Set<number>([...links.map((l) => l.userId), ...allCollections.map((c) => c.researcherId)])];
        const linkOf = new Map(links.map((l) => [l.userId, l]));

        // Uma consulta para todos os usuários e outra para todas as sincronizações (antes eram duas por pesquisador).
        const users = ids.length > 0 ? [...(await orm.User.where((u) => u.id.in(ids)).all())] : [];
        const syncs = ids.length > 0 ? ([...(await orm.SyncLog.where((l) => l.researcherId.in(ids)).all())] as { researcherId: number; receivedAt: string }[]) : [];
        const lastSyncOf = new Map<number, string>();
        for (const sync of syncs) {
            const current = lastSyncOf.get(sync.researcherId);
            if (current === undefined || new Date(sync.receivedAt) > new Date(current)) lastSyncOf.set(sync.researcherId, sync.receivedAt);
        }

        const researchers: ReportResearcher[] = [];
        for (const user of users) {
            // Nunca mostra gente de outra empresa, mesmo que um dado inconsistente aponte para ela.
            if (user.companyId !== research.companyId) continue;
            researchers.push({
                userId: user.id,
                name: user.name,
                username: user.username,
                avatarUrl: user.avatarUrl ?? null,
                targetCount: linkOf.get(user.id)?.targetCount ?? null,
                linked: linkOf.has(user.id),
                lastSyncAt: lastSyncOf.get(user.id) ?? null,
            });
        }

        if (query.researcherId !== undefined && !researchers.some((r) => r.userId === query.researcherId)) {
            throw new NotFoundException('Pesquisador não encontrado nesta pesquisa.');
        }

        const filter: ReportFilter = { from, to, researcherId: query.researcherId };
        const allowed = new Set(researchers.map((r) => r.userId));
        const collections = filterCollections(allCollections.filter((c) => allowed.has(c.researcherId)), filter);

        return {
            researchers: query.researcherId === undefined ? researchers : researchers.filter((r) => r.userId === query.researcherId),
            collections,
            filter,
        };
    }

    private async loadQuestions(researchId: number): Promise<ReportQuestion[]> {
        const orm = this.prisma.client.orm.public;
        const sections = [...(await orm.Section.where({ researchId }).all())];
        if (sections.length === 0) return [];
        const sectionIds = sections.map((s) => s.id);
        const sectionOrder = new Map(sections.map((s) => [s.id, s.order]));
        // Questões e alternativas de toda a pesquisa em duas consultas (antes: uma por seção e uma por questão).
        const rows = [...(await orm.Question.where((q) => q.sectionId.in(sectionIds)).all())];
        const questionIds = rows.map((q) => q.id);
        const allOptions = questionIds.length > 0 ? [...(await orm.QuestionOption.where((o) => o.questionId.in(questionIds)).all())] : [];
        const optionsOf = new Map<number, typeof allOptions>();
        for (const option of allOptions) {
            const list = optionsOf.get(option.questionId);
            if (list) list.push(option);
            else optionsOf.set(option.questionId, [option]);
        }
        // Mesma ordem de antes: por seção (na ordem em que vieram) e, dentro dela, as questões.
        const questions: ReportQuestion[] = [];
        for (const section of sections) {
            for (const q of rows.filter((row) => row.sectionId === section.id)) {
                questions.push({
                    id: q.id,
                    statement: q.statement,
                    type: q.type,
                    sectionOrder: sectionOrder.get(section.id) ?? section.order,
                    order: q.order,
                    options: (optionsOf.get(q.id) ?? []).map((o) => ({ id: o.id, text: o.text, order: o.order })),
                });
            }
        }
        return questions;
    }

    private async loadAnswers(questions: ReportQuestion[], collections: ReportCollection[]): Promise<ReportAnswer[]> {
        const orm = this.prisma.client.orm.public;
        if (questions.length === 0 || collections.length === 0) return [];
        const collectionIds = new Set(collections.map((c) => c.id));
        const questionIds = questions.map((q) => q.id);
        // Uma consulta para todas as respostas das questões (antes: uma por questão).
        const rows = [...(await orm.Answer.where((a) => a.questionId.in(questionIds)).all())];
        const answers: ReportAnswer[] = [];
        for (const a of rows) {
            if (a.collectionId !== null && collectionIds.has(a.collectionId)) {
                answers.push({ id: a.id, questionId: a.questionId, collectionId: a.collectionId, value: a.value });
            }
        }
        return answers;
    }

    private meta(research: { id: number; title: string; status: string; updatedAt?: string }, query: ReportQuery, filter: ReportFilter) {
        return {
            researchId: research.id,
            title: research.title,
            status: research.status,
            // Encerrada = estado final e sem edição: a última alteração da pesquisa é o próprio encerramento.
            closedAt: research.status === 'CLOSED' ? (research.updatedAt ?? null) : null,
            filter: {
                from: filter.from?.toISOString() ?? null,
                to: filter.to?.toISOString() ?? null,
                researcherId: query.researcherId ?? null,
            },
            generatedAt: new Date().toISOString(),
        };
    }

    /** Painel: total, por pesquisador, % da meta, última sincronização e tempo médio de coleta. */
    async panel(researchId: number, query: ReportQuery, currentUser: UserPayLoad) {
        const research = await this.loadResearch(researchId, currentUser);
        const { researchers, collections, filter } = await this.loadData(research, query);
        return { ...this.meta(research, query, filter), ...buildPanel(researchers, collections) };
    }

    /** Relatório: gráfico por questão de escolha e sim/não, com os mesmos filtros do painel. */
    async report(researchId: number, query: ReportQuery, currentUser: UserPayLoad) {
        const research = await this.loadResearch(researchId, currentUser);
        const { collections, filter } = await this.loadData(research, query);
        const questions = await this.loadQuestions(research.id);
        const answers = await this.loadAnswers(questions, collections);
        return {
            ...this.meta(research, query, filter),
            totalCollections: collections.length,
            questions: buildCharts(questions, collections, answers),
        };
    }

    /** CSV: uma linha por coleta, uma coluna por questão, com os mesmos filtros. */
    async exportCsv(researchId: number, query: ReportQuery, currentUser: UserPayLoad) {
        const research = await this.loadResearch(researchId, currentUser);
        const { researchers, collections } = await this.loadData(research, query);
        const questions = await this.loadQuestions(research.id);
        const answers = await this.loadAnswers(questions, collections);
        const names = new Map(researchers.map((r) => [r.userId, r.name]));
        return {
            fileName: `pesquisa-${research.id}-coletas.csv`,
            content: buildCsv(questions, collections, answers, names),
        };
    }
}
