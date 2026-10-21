import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AudioStorage } from '../collection/audio-storage.js';
import { CreateResearchDto, ResearchStatus } from './dto/create-research.dto.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { UpdateResearchDto } from './dto/update-research.dto.js';

const ALLOWED_TRANSITIONS: Record<ResearchStatus, ResearchStatus[]> = {
    [ResearchStatus.DRAFT]: [ResearchStatus.PUBLISHED],
    [ResearchStatus.PUBLISHED]: [ResearchStatus.IN_FIELD],
    [ResearchStatus.IN_FIELD]: [ResearchStatus.CLOSED],
    [ResearchStatus.CLOSED]: [], // estado final, sem saída
};

function assertValidTransition(current: ResearchStatus, next: ResearchStatus) {
    if (current === next) return;

    const allowed = ALLOWED_TRANSITIONS[current];

    if (!allowed.includes(next)) {
        throw new BadRequestException(
            `Invalid status transition: cannot move from ${current} to ${next}`
        );
    }
}

export const RESEARCH_LOCKED_MESSAGE =
    'Esta pesquisa já foi publicada ou baixada por um pesquisador e não pode mais ser editada.';

@Injectable()
export class ResearchService {
    private readonly logger = new Logger(ResearchService.name);

    constructor(private prisma: PrismaService, private audioStorage: AudioStorage) { }

    async create(createResearchDto: CreateResearchDto, currentUser: UserPayLoad) {
        if (new Date(createResearchDto.endDate) < new Date(createResearchDto.startDate)) throw new BadRequestException('The end date cannot be earlier than the start date');

        let companyId = currentUser.companyId;

        if (currentUser.profile === 'SUPERADMINISTRATOR') {
            if (!createResearchDto.companyId) throw new BadRequestException('The company ID is required for super administrators');
            companyId = createResearchDto.companyId;
        }

        if (!companyId) throw new ForbiddenException('User is not associated with a company');

        return await this.prisma.client.orm.public.Research.create({
            title: createResearchDto.title,
            description: createResearchDto.description,
            objective: createResearchDto.objective,
            startDate: createResearchDto.startDate,
            endDate: createResearchDto.endDate,
            targetAudience: createResearchDto.targetAudience,
            status: 'DRAFT',
            recordInterview: createResearchDto.recordInterview ?? false,
            companyId: companyId,
        })
    }

    // No token, `sub` é o username (não o id numérico).
    private async currentUserRecord(currentUser: UserPayLoad) {
        return this.prisma.client.orm.public.User.where({ username: String(currentUser.sub) }).first();
    }

    // Pesquisador só enxerga pesquisa publicada, da própria empresa e à qual esteja vinculado.
    private async isVisibleToResearcher(
        research: { id: number; status: string; companyId: number },
        currentUser: UserPayLoad,
    ): Promise<boolean> {
        if (research.status === ResearchStatus.DRAFT) return false;
        if (!currentUser.companyId || research.companyId !== currentUser.companyId) return false;

        const user = await this.currentUserRecord(currentUser);
        if (!user) return false;

        const link = await this.prisma.client.orm.public.ResearchResearcher.where({ researchId: research.id, userId: user.id }).first();
        return !!link;
    }

    async findAll(currentUser: UserPayLoad) {
        if (currentUser.profile === 'SUPERADMINISTRATOR') return this.prisma.client.orm.public.Research.all()

        if (!currentUser.companyId) throw new ForbiddenException('User is not associated with a company');

        if (currentUser.profile === 'RESEARCHER') {
            const orm = this.prisma.client.orm.public;
            const user = await this.currentUserRecord(currentUser);
            if (!user) return [];

            // Sem vínculo, a pesquisa não aparece: a lista parte dos vínculos do pesquisador.
            const links = await orm.ResearchResearcher.where({ userId: user.id }).all();
            const researches = await Promise.all(links.map((link) => orm.Research.where({ id: link.researchId }).first()));

            return researches.filter(
                (r): r is NonNullable<typeof r> =>
                    !!r && r.status !== ResearchStatus.DRAFT && r.companyId === currentUser.companyId,
            );
        }

        return await this.prisma.client.orm.public.Research.where({ companyId: currentUser.companyId }).all()
    }

    async findOne(id: number, currentUser: UserPayLoad) {
        if (currentUser.profile === 'SUPERADMINISTRATOR') {
            const research = await this.prisma.client.orm.public.Research.where({ id }).first()
            if (!research) throw new NotFoundException('Research not found')
            return research;
        }

        const research = await this.prisma.client.orm.public.Research.where({ id, companyId: currentUser.companyId }).first()

        if (!research) throw new ForbiddenException('Access denied: this research belongs to another company or does not exist');

        // Pesquisador não vinculado não enxerga a pesquisa (nem sabe que ela existe).
        if (currentUser.profile === 'RESEARCHER' && !(await this.isVisibleToResearcher(research, currentUser))) {
            throw new NotFoundException('Research not found');
        }

        return research;
    }

    /** Detalhe para a tela: a pesquisa + `locked` (para esconder os controles de edição). */
    async findOneWithLock(id: number, currentUser: UserPayLoad) {
        const research = await this.findOne(id, currentUser);
        return { ...research, locked: await this.isLocked(research) };
    }

    /**
     * Pesquisa travada: depois de publicada pelo administrador (status != DRAFT) ou de
     * baixada por um pesquisador (existe cópia em ResearchDownload), o conteúdo não pode
     * mais ser editado: dados, seções, questões, opções e regras.
     * Só o ciclo de vida (status) e o vínculo de pesquisadores continuam permitidos.
     */
    async isLocked(research: { id: number; status: string }): Promise<boolean> {
        if (research.status !== ResearchStatus.DRAFT) return true;
        const download = await this.prisma.client.orm.public.ResearchDownload.where({ researchId: research.id }).first();
        return !!download;
    }

    /** Lança 403 se a pesquisa estiver travada. Retorna a pesquisa para quem quiser reaproveitar. */
    async assertEditable(researchId: number, currentUser: UserPayLoad) {
        const research = await this.findOne(researchId, currentUser);
        if (await this.isLocked(research)) throw new ForbiddenException(RESEARCH_LOCKED_MESSAGE);
        return research;
    }

    async update(id: number, updateResearchDto: UpdateResearchDto, currentUser: UserPayLoad) {
        const research = await this.findOne(id, currentUser)

        if (research.status === ResearchStatus.CLOSED) throw new BadRequestException('Closed research cannot be modified');

        // Travada (publicada/baixada): só é aceita a mudança de status (PUBLISHED -> IN_FIELD -> CLOSED).
        const contentFields = Object.keys(updateResearchDto).filter(
            (key) => key !== 'status' && (updateResearchDto as Record<string, unknown>)[key] !== undefined,
        );
        if (contentFields.length > 0 && (await this.isLocked(research))) {
            throw new ForbiddenException(RESEARCH_LOCKED_MESSAGE);
        }

        // Gravar a entrevista é decisão de estrutura (muda o que o aplicativo exige e coleta):
        // depois de publicada, e enquanto estiver em campo, não pode ser ligada nem desligada.
        if (
            updateResearchDto.recordInterview !== undefined &&
            updateResearchDto.recordInterview !== research.recordInterview &&
            research.status !== ResearchStatus.DRAFT
        ) {
            throw new BadRequestException(
                'A gravação da entrevista não pode ser ligada ou desligada depois que a pesquisa foi publicada ou está em campo.'
            );
        }

        if (updateResearchDto.startDate && updateResearchDto.endDate) {
            if (new Date(updateResearchDto.endDate) < new Date(updateResearchDto.startDate)) throw new BadRequestException('The end date cannot be earlier than the start date');
        }

        if (updateResearchDto.status) {
            assertValidTransition(research.status as ResearchStatus, updateResearchDto.status);

            if (updateResearchDto.status === ResearchStatus.PUBLISHED && research.status !== ResearchStatus.PUBLISHED) {
                if (currentUser.profile === 'RESEARCHER') throw new ForbiddenException('Researchers cannot publish research');
                await this.assertHasQuestions(id);
            }
        }

        return await this.prisma.client.orm.public.Research.where({ id }).update(updateResearchDto);
    }

    // Publicar: DRAFT -> PUBLISHED. A partir daqui a pesquisa fica visível para o app.
    async publish(id: number, currentUser: UserPayLoad) {
        if (currentUser.profile === 'RESEARCHER') throw new ForbiddenException('Researchers cannot publish research');

        const research = await this.findOne(id, currentUser);

        if (research.status !== ResearchStatus.DRAFT) {
            throw new BadRequestException(`Only draft research can be published (current status: ${research.status})`);
        }

        await this.assertHasQuestions(id);

        return await this.prisma.client.orm.public.Research.where({ id }).update({ status: ResearchStatus.PUBLISHED });
    }

    // Pesquisa sem nenhuma questão não pode ser publicada
    private async assertHasQuestions(researchId: number) {
        const orm = this.prisma.client.orm.public;
        const sections = await orm.Section.where({ researchId }).all();

        for (const section of sections) {
            const first = await orm.Question.where({ sectionId: section.id }).first();
            if (first) return;
        }

        throw new BadRequestException('A research without questions cannot be published');
    }

    // ---------- vínculo pesquisador <-> pesquisa ----------

    /**
     * Quem está vinculado à pesquisa, com a meta e quanto cada um já entregou.
     * `collected` conta as coletas recebidas do pesquisador nesta pesquisa; `remaining` e `progress`
     * só existem quando há meta (`targetCount` nulo = sem meta definida).
     */
    async listResearchers(researchId: number, currentUser: UserPayLoad) {
        if (currentUser.profile === 'RESEARCHER') throw new ForbiddenException('Researchers cannot list linked researchers');

        await this.findOne(researchId, currentUser);
        const orm = this.prisma.client.orm.public;

        const links = await orm.ResearchResearcher.where({ researchId }).all();
        const collections = await orm.Collection.where({ researchId }).all();

        const collectedBy = new Map<number, number>();
        for (const c of collections) collectedBy.set(c.researcherId, (collectedBy.get(c.researcherId) ?? 0) + 1);

        const rows = await Promise.all(
            links.map(async (link) => {
                const user = await orm.User.where({ id: link.userId }).first();
                const collected = collectedBy.get(link.userId) ?? 0;
                const targetCount = link.targetCount ?? null;

                return {
                    id: link.id,
                    researchId: link.researchId,
                    userId: link.userId,
                    name: user?.name ?? null,
                    username: user?.username ?? null,
                    situation: user?.situation ?? null,
                    targetCount,
                    collected,
                    remaining: targetCount === null ? null : Math.max(0, targetCount - collected),
                    progress: targetCount === null ? null : Math.min(100, Math.round((collected / targetCount) * 100)),
                    createdAt: link.createdAt,
                };
            }),
        );

        return rows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR', { sensitivity: 'base' }));
    }

    // Vincula o pesquisador à pesquisa, com a meta de coletas. Se já estava vinculado, só atualiza a meta (quando enviada).
    async addResearcher(researchId: number, userId: number, currentUser: UserPayLoad, targetCount?: number) {
        if (currentUser.profile === 'RESEARCHER') throw new ForbiddenException('Researchers cannot link researchers');

        const research = await this.findOne(researchId, currentUser);
        const orm = this.prisma.client.orm.public;

        const user = await orm.User.where({ id: userId }).first();
        if (!user || user.profile !== 'RESEARCHER') throw new NotFoundException('Researcher not found');
        if (user.companyId !== research.companyId) throw new BadRequestException('The researcher belongs to another company');

        const existing = await orm.ResearchResearcher.where({ researchId, userId }).first();
        if (existing) {
            if (targetCount === undefined || targetCount === existing.targetCount) return existing;
            return await orm.ResearchResearcher.where({ id: existing.id }).update({ targetCount });
        }

        return await orm.ResearchResearcher.create({ researchId, userId, targetCount: targetCount ?? null });
    }

    // Altera a meta de um vínculo existente. Vale em qualquer fase: a pesquisa em campo não trava a meta.
    async updateResearcherTarget(researchId: number, userId: number, targetCount: number, currentUser: UserPayLoad) {
        if (currentUser.profile === 'RESEARCHER') throw new ForbiddenException('Researchers cannot change targets');

        await this.findOne(researchId, currentUser);
        const orm = this.prisma.client.orm.public;

        const link = await orm.ResearchResearcher.where({ researchId, userId }).first();
        if (!link) throw new NotFoundException('The researcher is not linked to this research');

        return await orm.ResearchResearcher.where({ id: link.id }).update({ targetCount });
    }

    // Desvincular remove só o vínculo: as coletas já recebidas do pesquisador (Collection) continuam na pesquisa.
    async removeResearcher(researchId: number, userId: number, currentUser: UserPayLoad) {
        if (currentUser.profile === 'RESEARCHER') throw new ForbiddenException('Researchers cannot unlink researchers');

        await this.findOne(researchId, currentUser);
        return await this.prisma.client.orm.public.ResearchResearcher.where({ researchId, userId }).delete();
    }

    async delete(id: number, currentUser: UserPayLoad) {
        const research = await this.findOne(id, currentUser)

        if (research.status !== ResearchStatus.DRAFT) throw new BadRequestException('Only draft research can be deleted.');

        const deleted = await this.prisma.client.orm.public.Research.where({ id }).delete();

        // As coletas e respostas saem junto (cascata no banco); as mídias delas (Cloudinary) também.
        // Todas ficam sob `<id da pesquisa>/`. Se a limpeza falhar, a exclusão já valeu: só registra.
        await this.audioStorage
            .removeDir(String(id))
            .catch((error) => this.logger.error(`Pesquisa ${id} excluída, mas as mídias não foram apagadas: ${error?.message ?? error}`));

        return deleted;
    }

    // Pacote completo da pesquisa para o app móvel (uma única resposta)
    async downloadPackage(researchId: number, deviceId: string, currentUser: UserPayLoad) {
        const orm = this.prisma.client.orm.public;

        if (currentUser.profile !== 'RESEARCHER') {
            throw new ForbiddenException('Only researchers linked to this research can download it');
        }

        const research = await orm.Research.where({ id: researchId }).first();

        // Rascunho não é visível para o app; pesquisa de outra empresa também não.
        if (!research || research.status === ResearchStatus.DRAFT || research.companyId !== currentUser.companyId) {
            throw new NotFoundException('Pesquisa não encontrada.');
        }

        // No token, `sub` é o username (não o id numérico)
        const user = await orm.User.where({ username: String(currentUser.sub) }).first();
        if (!user) throw new ForbiddenException('Usuário não encontrado.');

        const link = await orm.ResearchResearcher.where({ researchId, userId: user.id }).first();
        if (!link) throw new ForbiddenException('Você não está vinculado a esta pesquisa.');

        if (research.status === ResearchStatus.CLOSED) {
            throw new ForbiddenException('Pesquisa encerrada: não está disponível para download.');
        }

        const now = new Date();
        const start = new Date(research.startDate);
        const end = new Date(research.endDate);
        // data de término sem horário vale até o fim do dia
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(research.endDate))) end.setUTCHours(23, 59, 59, 999);

        if (now < start || now > end) {
            throw new ForbiddenException('Pesquisa fora da vigência: não está disponível para download.');
        }

        // Seções, questões e opções, sempre na ordem do questionário
        const sections = (await orm.Section.where({ researchId: research.id }).all()).sort((a, b) => a.order - b.order);

        const sectionsWithDetails = await Promise.all(
            sections.map(async (section) => {
                const questions = (await orm.Question.where({ sectionId: section.id }).all()).sort((a, b) => a.order - b.order);

                const questionsWithDetails = await Promise.all(
                    questions.map(async (question) => {
                        const options = (await orm.QuestionOption.where({ questionId: question.id }).all()).sort((a, b) => a.order - b.order);

                        return {
                            ...question, // campos planos mantidos por compatibilidade com o app
                            options,
                            validations: {
                                isRequired: question.isRequired,
                                minSelections: question.minSelections,
                                maxSelections: question.maxSelections,
                                minValue: question.minValue,
                                maxValue: question.maxValue,
                                minDate: question.minDate,
                                maxDate: question.maxDate,
                                maxLength: question.maxLength,
                            },
                            recording: {
                                maxFiles: question.maxFiles,
                                maxDuration: question.maxDuration,
                            },
                        };
                    })
                );

                return { ...section, questions: questionsWithDetails };
            })
        );

        // Regras de pulo/exibição: a questão alvo só aparece quando a questão de origem
        // recebe a resposta triggerValue.
        const rules = await orm.QuestionRule.where({ researchId: research.id }).all();
        const displayRules = rules.map((rule) => ({
            id: rule.id,
            sourceQuestionId: rule.sourceQuestionId,
            triggerValue: rule.triggerValue,
            targetQuestionId: rule.targetQuestionId,
        }));

        // Registra a cópia ativa: a cópia anterior deste pesquisador para esta pesquisa deixa de ser ativa
        // (regra completa em W11).
        const previous = await orm.ResearchDownload.where({ researchId: research.id, userId: user.id, active: true }).all();
        for (const old of previous) {
            await orm.ResearchDownload.where({ id: old.id }).update({ active: false });
        }
        const copy = await orm.ResearchDownload.create({
            researchId: research.id,
            deviceId,
            userId: user.id,
            active: true,
        });

        // Primeiro download de uma pesquisa publicada: ela passa a estar "em campo".
        // Downloads seguintes (já em campo) não alteram o status.
        let status = research.status;
        if (status === ResearchStatus.PUBLISHED) {
            await orm.Research.where({ id: research.id }).update({ status: ResearchStatus.IN_FIELD });
            status = ResearchStatus.IN_FIELD;
        }

        return {
            ...research,
            status,
            // Interruptor de gravação: o app só inicia a coleta depois do consentimento quando isto é true
            recordInterview: research.recordInterview,
            sections: sectionsWithDetails,
            displayRules,
            download: { id: copy.id, deviceId, downloadedAt: copy.createdAt },
        };
    }
}