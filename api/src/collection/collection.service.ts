import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { UserPayLoad } from '../auth/current-user.type.js';
import { AudioStorage, audioExtensionFor } from './audio-storage.js';
import { assertValidConsent } from './consent.js';
import type { CollectionPayloadDto } from './dto/create-collection.dto.js';

export interface UploadedAudio {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

@Injectable()
export class CollectionService {
    constructor(
        private prisma: PrismaService,
        private audioStorage: AudioStorage,
    ) { }

    // Recebe uma coleta feita no aplicativo: respostas, consentimento e (se a pesquisa grava) o áudio.
    async create(payload: CollectionPayloadDto, audio: UploadedAudio | undefined, currentUser: UserPayLoad) {
        if (currentUser.profile !== 'RESEARCHER') {
            throw new ForbiddenException('Somente pesquisadores enviam coletas.');
        }

        const orm = this.prisma.client.orm.public;

        // No token, `sub` é o username (não o id numérico)
        const user = await orm.User.where({ username: String(currentUser.sub) }).first();
        if (!user) throw new ForbiddenException('Usuário não encontrado.');

        const research = await orm.Research.where({ id: payload.researchId }).first();
        if (!research || research.status === 'DRAFT' || research.companyId !== currentUser.companyId) {
            throw new NotFoundException('Pesquisa não encontrada.');
        }

        const link = await orm.ResearchResearcher.where({ researchId: research.id, userId: user.id }).first();
        if (!link) throw new ForbiddenException('Você não está vinculado a esta pesquisa.');

        // Reenvio da mesma coleta (conexão caiu depois de o servidor receber): devolve a já gravada.
        if (payload.clientId) {
            const existing = await orm.Collection.where({
                researchId: research.id,
                researcherId: user.id,
                clientId: payload.clientId,
            }).first();
            if (existing) return this.toSummary(existing, user.name, user.name);
        }

        if (new Date(payload.finishedAt) < new Date(payload.startedAt)) {
            throw new BadRequestException('O fim da coleta não pode ser anterior ao início.');
        }

        // Consentimento: sem ele, o servidor recusa a coleta de pesquisa que grava — mesmo com o app liberando.
        let consentAt: Date | null = null;
        if (research.recordInterview) {
            consentAt = assertValidConsent(payload.consent, payload.startedAt);
        } else if (audio) {
            throw new BadRequestException('Esta pesquisa não grava a entrevista: o áudio foi recusado.');
        }

        let audioExtension: string | null = null;
        if (audio) {
            audioExtension = audioExtensionFor(audio.mimetype);
            if (!audioExtension) throw new BadRequestException('Formato de áudio não suportado.');
            if (!audio.size || audio.buffer.length === 0) throw new BadRequestException('O arquivo de áudio está vazio.');
        }

        await this.assertAnswersBelongToResearch(research.id, payload.answers);

        // Tudo validado: só agora o áudio vai para o disco.
        const audioPath = audio && audioExtension
            ? await this.audioStorage.save(research.id, audio.buffer, audioExtension)
            : null;

        let collection;
        try {
            collection = await orm.Collection.create({
                researchId: research.id,
                researcherId: user.id,
                deviceId: payload.deviceId ?? null,
                clientId: payload.clientId ?? null,
                startedAt: new Date(payload.startedAt).toISOString(),
                finishedAt: new Date(payload.finishedAt).toISOString(),
                consentGiven: consentAt !== null,
                consentAt: consentAt ? consentAt.toISOString() : null,
                // quem confirmou o aceite: o pesquisador autenticado, nunca um valor enviado pelo aparelho
                consentConfirmedById: consentAt ? user.id : null,
                audioPath,
                audioMimeType: audio ? audio.mimetype : null,
                audioSizeBytes: audio ? audio.buffer.length : null,
                audioDurationSeconds: audio ? (payload.audioDurationSeconds ?? null) : null,
            });

            for (const answer of payload.answers) {
                await orm.Answer.create({
                    questionId: answer.questionId,
                    value: answer.value,
                    collectionId: collection.id,
                });
            }
        } catch (error) {
            // Não deixa coleta pela metade nem áudio órfão.
            if (collection) await orm.Collection.where({ id: collection.id }).delete().catch(() => undefined);
            if (audioPath) await this.audioStorage.remove(audioPath).catch(() => undefined);
            throw error;
        }

        return this.toSummary(collection, user.name, consentAt ? user.name : null);
    }

    // Lista as coletas da pesquisa, indicando quais têm gravação e a duração de cada uma.
    async findAll(researchId: number, currentUser: UserPayLoad) {
        const orm = this.prisma.client.orm.public;
        const research = await orm.Research.where({ id: researchId }).first();
        this.assertCompanyAdmin(research, currentUser);

        const collections = (await orm.Collection.where({ researchId }).all())
            .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

        const names = new Map<number, string>();
        const nameOf = async (id: number | null) => {
            if (id === null) return null;
            if (!names.has(id)) {
                const person = await orm.User.where({ id }).first();
                names.set(id, person?.name ?? '');
            }
            return names.get(id) || null;
        };

        return Promise.all(
            collections.map(async (c) =>
                this.toSummary(c, await nameOf(c.researcherId), await nameOf(c.consentConfirmedById)),
            ),
        );
    }

    // Abre uma coleta com as respostas, na ordem do questionário (seção e pergunta).
    // Perguntas sem resposta também voltam (answer: null): o administrador vê o que ficou em branco.
    async findOne(id: number, currentUser: UserPayLoad) {
        const orm = this.prisma.client.orm.public;

        const collection = await orm.Collection.where({ id }).first();
        if (!collection) throw new NotFoundException('Coleta não encontrada.');

        const research = await orm.Research.where({ id: collection.researchId }).first();
        this.assertCompanyAdmin(research, currentUser);

        const researcher = await orm.User.where({ id: collection.researcherId }).first();
        const confirmedBy =
            collection.consentConfirmedById !== null
                ? await orm.User.where({ id: collection.consentConfirmedById }).first()
                : null;

        // Mais de uma resposta para a mesma pergunta não deveria ocorrer; se ocorrer, vale a mais recente.
        const answerByQuestion = new Map<number, string>();
        const answers = (await orm.Answer.where({ collectionId: collection.id }).all()).sort((a, b) => a.id - b.id);
        for (const answer of answers) answerByQuestion.set(answer.questionId, answer.value);

        const sections = (await orm.Section.where({ researchId: collection.researchId }).all()).sort(
            (a, b) => a.order - b.order,
        );

        const detailedSections = await Promise.all(
            sections.map(async (section) => {
                const questions = (await orm.Question.where({ sectionId: section.id }).all()).sort(
                    (a, b) => a.order - b.order,
                );

                const detailedQuestions = await Promise.all(
                    questions.map(async (question) => {
                        const options = (await orm.QuestionOption.where({ questionId: question.id }).all())
                            .sort((a, b) => a.order - b.order)
                            .map((option) => ({ id: option.id, text: option.text }));

                        return {
                            id: question.id,
                            statement: question.statement,
                            type: question.type,
                            isRequired: question.isRequired,
                            scaleLeftLabel: question.scaleLeftLabel ?? null,
                            scaleRightLabel: question.scaleRightLabel ?? null,
                            options,
                            answer: answerByQuestion.get(question.id) ?? null,
                        };
                    }),
                );

                return { id: section.id, title: section.title, questions: detailedQuestions };
            }),
        );

        return {
            ...this.toSummary(collection, researcher?.name ?? null, confirmedBy?.name ?? null),
            sections: detailedSections,
        };
    }

    // Abre o áudio de uma coleta. Só administrador da empresa dona da pesquisa chega aqui.
    async getAudio(id: number, currentUser: UserPayLoad) {
        const orm = this.prisma.client.orm.public;

        const collection = await orm.Collection.where({ id }).first();
        if (!collection) throw new NotFoundException('Coleta não encontrada.');

        const research = await orm.Research.where({ id: collection.researchId }).first();
        this.assertCompanyAdmin(research, currentUser);

        if (!collection.audioPath) throw new NotFoundException('Esta coleta não tem gravação.');

        const file = await this.audioStorage.open(collection.audioPath);
        if (!file) throw new NotFoundException('O arquivo de áudio desta coleta não foi encontrado.');

        return { ...file, mimeType: collection.audioMimeType ?? 'audio/mp4' };
    }

    // O áudio é dado pessoal: apenas administrador da empresa da pesquisa lista as coletas e ouve.
    private assertCompanyAdmin(research: { companyId: number } | null | undefined, currentUser: UserPayLoad) {
        if (
            !research ||
            currentUser.profile !== 'ADMINISTRATOR' ||
            !currentUser.companyId ||
            research.companyId !== currentUser.companyId
        ) {
            throw new ForbiddenException('Acesso negado: somente administradores da empresa desta pesquisa acessam as coletas e os áudios.');
        }
    }

    private async assertAnswersBelongToResearch(researchId: number, answers: { questionId: number }[]) {
        if (answers.length === 0) return;

        const orm = this.prisma.client.orm.public;
        const validIds = new Set<number>();
        const sections = await orm.Section.where({ researchId }).all();
        for (const section of sections) {
            for (const question of await orm.Question.where({ sectionId: section.id }).all()) {
                validIds.add(question.id);
            }
        }

        const stray = answers.find((a) => !validIds.has(a.questionId));
        if (stray) throw new BadRequestException(`A questão ${stray.questionId} não pertence a esta pesquisa.`);
    }

    private toSummary(
        collection: {
            id: number;
            researchId: number;
            researcherId: number;
            startedAt: string;
            finishedAt: string;
            receivedAt: string;
            consentGiven: boolean;
            consentAt: string | null;
            consentConfirmedById: number | null;
            audioPath: string | null;
            audioDurationSeconds: number | null;
            audioSizeBytes: number | null;
        },
        researcherName: string | null,
        consentConfirmedByName: string | null,
    ) {
        return {
            id: collection.id,
            researchId: collection.researchId,
            researcherId: collection.researcherId,
            researcherName,
            startedAt: collection.startedAt,
            finishedAt: collection.finishedAt,
            receivedAt: collection.receivedAt,
            consent: {
                given: collection.consentGiven,
                at: collection.consentAt,
                confirmedById: collection.consentConfirmedById,
                confirmedByName: consentConfirmedByName,
            },
            hasAudio: collection.audioPath !== null,
            audioDurationSeconds: collection.audioDurationSeconds,
            audioSizeBytes: collection.audioSizeBytes,
        };
    }
}
