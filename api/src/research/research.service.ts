import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AudioStorage } from '../collection/audio-storage.js';
import { CreateResearchDto, ResearchStatus } from './dto/create-research.dto.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { UpdateResearchDto } from './dto/update-research.dto.js';
import {
    assertStructureEditable,
    copyRevokedException,
    copyStatus,
    copyStatusOf,
    getLockState,
    isDeviceRevoked,
    registerCopy,
    returnCopy,
    revokeCopy,
    unblockDevice,
    type CopyRow,
} from './research-copies.js';

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

    async findAll(currentUser: UserPayLoad, deviceId?: string) {
        if (currentUser.profile === 'SUPERADMINISTRATOR') return this.prisma.client.orm.public.Research.all()

        if (!currentUser.companyId) throw new ForbiddenException('User is not associated with a company');

        if (currentUser.profile === 'RESEARCHER') {
            const orm = this.prisma.client.orm.public;
            const user = await this.currentUserRecord(currentUser);
            if (!user) return [];

            // Sem vínculo, a pesquisa não aparece: a lista parte dos vínculos do pesquisador.
            const links = await orm.ResearchResearcher.where({ userId: user.id }).all();
            const researches = await Promise.all(links.map((link) => orm.Research.where({ id: link.researchId }).first()));

            const visible = researches.filter(
                (r): r is NonNullable<typeof r> =>
                    !!r && r.status !== ResearchStatus.DRAFT && r.companyId === currentUser.companyId,
            );

            // Com o aparelho identificado, cada pesquisa diz se a cópia dele ainda vale (ACTIVE) ou foi
            // devolvida/revogada: é assim que o app descobre que o administrador revogou o acesso.
            if (!deviceId) return visible;
            return Promise.all(
                visible.map(async (r) => ({ ...r, copyStatus: await copyStatusOf(orm, r.id, user.id, deviceId) })),
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

    /** Detalhe para a tela: a pesquisa + estado da trava (`locked`, motivo e quantas cópias ativas). */
    async findOneWithLock(id: number, currentUser: UserPayLoad) {
        const research = await this.findOne(id, currentUser);
        const lock = await getLockState(this.prisma.client.orm.public, research);
        return {
            ...research,
            locked: lock.locked,
            lockReason: lock.reason,
            lockMessage: lock.message,
            activeCopies: lock.activeCopies,
        };
    }

    /**
     * Estrutura travada = há ao menos uma cópia ativa (ou a pesquisa está encerrada).
     * É calculado na hora a partir das cópias: devolvida a última, destrava sozinho.
     */
    async isLocked(research: { id: number; status: string }): Promise<boolean> {
        return (await getLockState(this.prisma.client.orm.public, research)).locked;
    }

    /**
     * Porta única de toda escrita na ESTRUTURA do questionário (seção, questão, opção, validação, ordem,
     * regra de pulo, gravação). Lança 403 se travada; devolve a pesquisa para quem quiser reaproveitar.
     * O que NÃO passa por aqui continua liberado: vincular pesquisador, meta, prazo, status, relatórios.
     */
    async assertEditable(researchId: number, currentUser: UserPayLoad) {
        const research = await this.findOne(researchId, currentUser);
        await assertStructureEditable(this.prisma.client.orm.public, research);
        return research;
    }

    async update(id: number, updateResearchDto: UpdateResearchDto, currentUser: UserPayLoad) {
        const research = await this.findOne(id, currentUser)

        if (research.status === ResearchStatus.CLOSED) throw new BadRequestException('Closed research cannot be modified');

        // Só a configuração de gravação é estrutura do questionário (muda o que o aplicativo exige e coleta):
        // com cópia ativa ela não pode ser ligada nem desligada. Título, descrição, público, datas (prorrogar
        // o prazo) e status não mexem na estrutura e continuam liberados com a trava ligada.
        if (
            updateResearchDto.recordInterview !== undefined &&
            updateResearchDto.recordInterview !== research.recordInterview
        ) {
            await assertStructureEditable(this.prisma.client.orm.public, research);
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

    /**
     * Encerrar (W12): a pesquisa vira CLOSED, estado final. A partir daqui a API recusa coleta nova
     * (sincronização e envio direto) e a pesquisa não é mais editada nem baixada: o resultado fica congelado.
     * Vale para pesquisa publicada ou em campo; rascunho nunca foi a campo, então não há o que encerrar.
     * Idempotente: encerrar de novo devolve a pesquisa como está.
     */
    async close(id: number, currentUser: UserPayLoad) {
        if (currentUser.profile !== 'ADMINISTRATOR') throw new ForbiddenException('Somente o administrador da empresa encerra a pesquisa.');

        const research = await this.findOne(id, currentUser);

        if (research.status === ResearchStatus.CLOSED) return research;
        if (research.status === ResearchStatus.DRAFT) {
            throw new BadRequestException('Uma pesquisa em rascunho não pode ser encerrada: publique-a ou exclua-a.');
        }

        const closed = await this.prisma.client.orm.public.Research.where({ id }).update({ status: ResearchStatus.CLOSED });
        this.logger.warn(`Pesquisa ${id} encerrada por ${currentUser.username ?? currentUser.sub}`);
        return closed;
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

    // ---------- cópias em campo (W11) ----------

    private async copyView(copy: CopyRow, names: Map<number, { name: string; username: string }>, deviceBlocked = false) {
        const owner = copy.userId != null ? names.get(copy.userId) : undefined;
        const revoker = copy.revokedById != null ? names.get(copy.revokedById) : undefined;
        const unblocker = copy.unblockedById != null ? names.get(copy.unblockedById) : undefined;
        return {
            id: copy.id,
            researchId: copy.researchId,
            status: copyStatus(copy),
            userId: copy.userId,
            researcherName: owner?.name ?? null,
            researcherUsername: owner?.username ?? null,
            deviceId: copy.deviceId,
            downloadedAt: copy.createdAt,
            returnedAt: copy.returnedAt ?? null,
            revokedAt: copy.revokedAt ?? null,
            revokedById: copy.revokedById ?? null,
            revokedByName: revoker?.name ?? null,
            revokeReason: copy.revokeReason ?? null,
            unblockedAt: copy.unblockedAt ?? null,
            unblockedByName: unblocker?.name ?? null,
            // O aparelho desta cópia está bloqueado agora (revogado e ainda não desbloqueado): dá para desbloquear.
            deviceBlocked,
        };
    }

    /**
     * Quem está com a pesquisa: contador de cópias ativas, o motivo da trava e o histórico completo
     * (ativas primeiro; devolvidas e revogadas ficam registradas com data).
     */
    async listCopies(researchId: number, currentUser: UserPayLoad) {
        if (currentUser.profile === 'RESEARCHER') throw new ForbiddenException('Researchers cannot list copies');

        const research = await this.findOne(researchId, currentUser);
        const orm = this.prisma.client.orm.public;
        const rows = (await orm.ResearchDownload.where({ researchId }).all()) as CopyRow[];

        const names = new Map<number, { name: string; username: string }>();
        const ids = new Set<number>();
        for (const row of rows) {
            if (row.userId != null) ids.add(row.userId);
            if (row.revokedById != null) ids.add(row.revokedById);
            if (row.unblockedById != null) ids.add(row.unblockedById);
        }
        for (const id of ids) {
            const u = await orm.User.where({ id }).first();
            if (u) names.set(id, { name: u.name, username: u.username });
        }

        const blockedDevices = new Set<string>();
        for (const row of rows) {
            if (row.revokedAt && !row.unblockedAt && !row.active) blockedDevices.add(row.deviceId);
        }
        const copies = await Promise.all(rows.map((row) => this.copyView(row, names, blockedDevices.has(row.deviceId))));
        const rank = { ACTIVE: 0, REVOKED: 1, RETURNED: 1 } as const;
        copies.sort(
            (a, b) =>
                rank[a.status] - rank[b.status] ||
                String(b.revokedAt ?? b.returnedAt ?? b.downloadedAt).localeCompare(String(a.revokedAt ?? a.returnedAt ?? a.downloadedAt)),
        );

        const lock = await getLockState(orm, research);
        return {
            researchId,
            locked: lock.locked,
            lockReason: lock.reason,
            lockMessage: lock.message,
            activeCopies: lock.activeCopies,
            copies,
        };
    }

    /**
     * Devolução: o aparelho informa que não tem mais a pesquisa. Registra a data e o contador cai;
     * na última, a pesquisa volta a ser editável sozinha. Idempotente (devolver de novo não falha).
     */
    async returnOwnCopy(researchId: number, deviceId: string, currentUser: UserPayLoad) {
        if (currentUser.profile !== 'RESEARCHER') throw new ForbiddenException('Only researchers return copies');

        const orm = this.prisma.client.orm.public;
        const research = await orm.Research.where({ id: researchId }).first();
        if (!research || research.companyId !== currentUser.companyId) throw new NotFoundException('Pesquisa não encontrada.');

        const user = await this.currentUserRecord(currentUser);
        if (!user) throw new ForbiddenException('Usuário não encontrado.');

        const { returned, copy } = await returnCopy(orm, { researchId, userId: user.id, deviceId });
        const lock = await getLockState(orm, research);

        return {
            returned,
            returnedAt: copy?.returnedAt ?? null,
            // `revoked`: o administrador já tinha revogado este aparelho; o app deve apagar a pesquisa local.
            revoked: !returned && (await isDeviceRevoked(orm, researchId, deviceId)),
            activeCopies: lock.activeCopies,
            locked: lock.locked,
        };
    }

    /**
     * Revogação forçada (aparelho perdido, quebrado, pesquisador que saiu): a cópia deixa de contar,
     * o contador é liberado e o aparelho perde o acesso à pesquisa (não baixa, não envia coletas
     * novas nem arquivos). Registra quem revogou, quando e por quê.
     */
    async revokeActiveCopy(researchId: number, copyId: number, reason: string | undefined, currentUser: UserPayLoad) {
        if (currentUser.profile === 'RESEARCHER') throw new ForbiddenException('Researchers cannot revoke copies');

        const research = await this.findOne(researchId, currentUser);
        const orm = this.prisma.client.orm.public;

        const copy = (await orm.ResearchDownload.where({ id: copyId, researchId }).first()) as CopyRow | null;
        if (!copy) throw new NotFoundException('Cópia não encontrada nesta pesquisa.');

        if (!copy.active) {
            if (copy.revokedAt) return this.revocationResult(copy, research, orm); // já revogada: nada a refazer
            throw new BadRequestException('Esta cópia já foi devolvida pelo aparelho: não há o que revogar.');
        }

        const admin = await this.currentUserRecord(currentUser);
        if (!admin) throw new ForbiddenException('Usuário não encontrado.');

        const revoked = await revokeCopy(orm, copy, { revokedById: admin.id, reason });
        this.logger.warn(
            `Cópia ${copy.id} da pesquisa ${researchId} (aparelho ${copy.deviceId}) revogada por ${admin.username}` +
                (reason ? `: ${reason}` : ''),
        );
        return this.revocationResult(revoked, research, orm);
    }

    /**
     * Desbloquear aparelho: desfaz a revogação. O histórico da revogação fica (com quem desbloqueou e quando)
     * e o aparelho volta a poder baixar a pesquisa, o que cria uma cópia nova e trava o questionário de novo.
     * Idempotente: desbloquear um aparelho que não está bloqueado não faz nada.
     */
    async unblockCopyDevice(researchId: number, copyId: number, currentUser: UserPayLoad) {
        if (currentUser.profile === 'RESEARCHER') throw new ForbiddenException('Researchers cannot unblock devices');

        const research = await this.findOne(researchId, currentUser);
        const orm = this.prisma.client.orm.public;

        const copy = (await orm.ResearchDownload.where({ id: copyId, researchId }).first()) as CopyRow | null;
        if (!copy) throw new NotFoundException('Cópia não encontrada nesta pesquisa.');
        if (!copy.revokedAt) throw new BadRequestException('Só aparelhos com a cópia revogada podem ser desbloqueados.');

        const admin = await this.currentUserRecord(currentUser);
        if (!admin) throw new ForbiddenException('Usuário não encontrado.');

        const changed = await unblockDevice(orm, researchId, copy.deviceId, { unblockedById: admin.id });
        if (changed > 0) {
            this.logger.warn(`Aparelho ${copy.deviceId} desbloqueado na pesquisa ${researchId} por ${admin.username}`);
        }

        const fresh = (await orm.ResearchDownload.where({ id: copyId }).first()) as CopyRow;
        return this.revocationResult(fresh, research, orm);
    }

    private async revocationResult(copy: CopyRow, research: { id: number; status: string }, orm: any) {
        const names = new Map<number, { name: string; username: string }>();
        for (const id of [copy.userId, copy.revokedById, copy.unblockedById]) {
            if (id == null) continue;
            const u = await orm.User.where({ id }).first();
            if (u) names.set(id, { name: u.name, username: u.username });
        }
        const lock = await getLockState(orm, research);
        return {
            copy: await this.copyView(copy, names, await isDeviceRevoked(orm, copy.researchId, copy.deviceId)),
            activeCopies: lock.activeCopies,
            locked: lock.locked,
        };
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

        // Aparelho com a cópia revogada pelo administrador não baixa de novo (o acesso dele foi invalidado).
        if (await isDeviceRevoked(orm, research.id, deviceId)) throw copyRevokedException();

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

        // Registra a cópia ativa (pesquisador + aparelho + data). O mesmo aparelho baixando de novo renova a
        // própria cópia; o mesmo pesquisador em outro aparelho cria outra cópia (conta duas). Com a primeira
        // cópia a estrutura do questionário trava (W11).
        const copy = await registerCopy(orm, { researchId: research.id, userId: user.id, deviceId });

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