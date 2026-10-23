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
        const ids = new Set<number>([...links.map((l) => l.userId), ...allCollections.map((c) => c.researcherId)]);
        const linkOf = new Map(links.map((l) => [l.userId, l]));

        const researchers: ReportResearcher[] = [];
        for (const userId of ids) {
            const user = await orm.User.where({ id: userId }).first();
            // Nunca mostra gente de outra empresa, mesmo que um dado inconsistente aponte para ela.
            if (!user || user.companyId !== research.companyId) continue;
            const syncs = (await orm.SyncLog.where({ researcherId: userId }).all()) as { receivedAt: string }[];
            const lastSyncAt = syncs.reduce<string | null>(
                (latest, s) => (latest === null || new Date(s.receivedAt) > new Date(latest) ? s.receivedAt : latest),
                null,
            );
            researchers.push({
                userId,
                name: user.name,
                username: user.username,
                targetCount: linkOf.get(userId)?.targetCount ?? null,
                linked: linkOf.has(userId),
                lastSyncAt,
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
        const sections = await orm.Section.where({ researchId }).all();
        const questions: ReportQuestion[] = [];
        for (const section of sections) {
            for (const q of await orm.Question.where({ sectionId: section.id }).all()) {
                const options = await orm.QuestionOption.where({ questionId: q.id }).all();
                questions.push({
                    id: q.id,
                    statement: q.statement,
                    type: q.type,
                    sectionOrder: section.order,
                    order: q.order,
                    options: options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
                });
            }
        }
        return questions;
    }

    private async loadAnswers(questions: ReportQuestion[], collections: ReportCollection[]): Promise<ReportAnswer[]> {
        const orm = this.prisma.client.orm.public;
        const ids = new Set(collections.map((c) => c.id));
        const answers: ReportAnswer[] = [];
        for (const q of questions) {
            for (const a of await orm.Answer.where({ questionId: q.id }).all()) {
                if (a.collectionId !== null && ids.has(a.collectionId)) {
                    answers.push({ id: a.id, questionId: a.questionId, collectionId: a.collectionId, value: a.value });
                }
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
