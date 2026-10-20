import { db } from './db.js';
import * as bcrypt from 'bcrypt';

// Seed de demonstração: cria (se ainda não existirem) uma empresa, um administrador, pesquisadores e uma
// pesquisa completa, e insere 100 coletas com respostas variadas.
//
// Uso (na pasta api):  npx tsx src/prisma/seed-demo.ts
// Outra quantidade:    SEED_COLLECTIONS=250 npx tsx src/prisma/seed-demo.ts   (PowerShell: $env:SEED_COLLECTIONS=250; npx tsx src/prisma/seed-demo.ts)
//
// Pode ser executado mais de uma vez: tudo é identificado por nomes/ids fixos (`seed-<n>`), então
// uma nova execução só completa o que faltar, sem duplicar.

const TOTAL_COLLECTIONS = Number(process.env.SEED_COLLECTIONS) || 100;
const DEMO_PASSWORD = 'demo123'; //senha do demo.admin
const COMPANY_NAME = 'Empresa Demo (seed)';
const RESEARCH_TITLE = 'Satisfação dos clientes do varejo (seed)';

const ADMIN = { name: 'Administrador Demo', username: 'demo.admin' }; //senha demo123
const RESEARCHERS = [
    { name: 'Ana Souza', username: 'demo.ana' },
    { name: 'Bruno Lima', username: 'demo.bruno' },
    { name: 'Carla Mendes', username: 'demo.carla' },
    { name: 'Diego Alves', username: 'demo.diego' },
    { name: 'Elisa Rocha', username: 'demo.elisa' },
];

// Gerador pseudoaleatório com semente fixa: a mesma execução sempre gera os mesmos dados.
function createRandom(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const random = createRandom(20261020);
const between = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
const chance = (probability: number) => random() < probability;

const FIRST_NAMES = ['João', 'Maria', 'José', 'Ana', 'Pedro', 'Juliana', 'Lucas', 'Fernanda', 'Rafael', 'Camila', 'Marcos', 'Patrícia', 'Gabriel', 'Aline', 'Felipe', 'Larissa', 'Rodrigo', 'Beatriz', 'Thiago', 'Vanessa'];
const LAST_NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Nascimento', 'Barbosa', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Araújo'];
const SUGGESTIONS = [
    'Ampliar o horário de funcionamento aos sábados.',
    'Mais opções de pagamento no caixa.',
    'O atendimento é bom, mas a fila demora.',
    'Gostaria de ver mais variedade de produtos.',
    'Os preços poderiam ser mais competitivos.',
    'Melhorar a sinalização dentro da loja.',
    'Ótimo atendimento, continuem assim!',
    'Reduzir o tempo de espera na entrega.',
    'Faltam atendentes nos horários de pico.',
    'Criar um programa de fidelidade.',
];

async function ensureCompany() {
    const orm = db.orm.public;
    const existing = await orm.Company.where({ legalName: COMPANY_NAME }).first();
    if (existing) return existing;
    return orm.Company.create({
        legalName: COMPANY_NAME,
        contactInformation: 'contato@empresademo.com.br | (87) 99999-0000',
        situation: 'ACTIVE',
    });
}

async function ensureUser(
    data: { name: string; username: string },
    profile: 'ADMINISTRATOR' | 'RESEARCHER',
    companyId: number,
    passwordHash: string,
) {
    const orm = db.orm.public;
    const existing = await orm.User.where({ username: data.username }).first();
    if (existing) return existing;
    return orm.User.create({
        name: data.name,
        username: data.username,
        passwordHash,
        profile,
        companyId,
    });
}

type QuestionKey =
    | 'name' | 'age' | 'lastPurchase' | 'income'
    | 'recommend' | 'service' | 'values' | 'shoppingTime' | 'location' | 'suggestion';

interface SeededQuestion {
    id: number;
    options: { id: number; text: string }[];
    isRequired: boolean;
}

async function ensureResearch(companyId: number): Promise<{ id: number; questions: Record<QuestionKey, SeededQuestion> }> {
    const orm = db.orm.public;
    let research = await orm.Research.where({ companyId, title: RESEARCH_TITLE }).first();

    if (!research) {
        research = await orm.Research.create({
            title: RESEARCH_TITLE,
            description: 'Pesquisa de satisfação com clientes do varejo, gerada pelo seed de demonstração.',
            objective: 'Medir a satisfação, o perfil e as sugestões dos clientes da loja.',
            startDate: new Date(Date.now() - 30 * 86_400_000).toISOString(),
            endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
            targetAudience: 'Clientes maiores de 16 anos',
            status: 'IN_FIELD',
            recordInterview: false,
            companyId,
        });

        const profileSection = await orm.Section.create({ title: 'Perfil do entrevistado', order: 1, researchId: research.id });
        const experienceSection = await orm.Section.create({ title: 'Experiência de compra', order: 2, researchId: research.id });

        const question = async (
            sectionId: number,
            order: number,
            statement: string,
            type: string,
            extra: Record<string, unknown> = {},
            options: string[] = [],
        ) => {
            const created = await orm.Question.create({
                statement,
                type: type as never,
                isRequired: false,
                order,
                sectionId,
                ...extra,
            } as never);
            for (const [index, text] of options.entries()) {
                await orm.QuestionOption.create({ text, order: index + 1, questionId: created.id });
            }
            return created;
        };

        await question(profileSection.id, 1, 'Qual é o seu nome?', 'FREE_TEXT', { isRequired: true, maxLength: 80 });
        await question(profileSection.id, 2, 'Qual é a sua idade?', 'NUMERIC', { isRequired: true, minValue: 16, maxValue: 99 });
        await question(profileSection.id, 3, 'Quando foi a sua última compra?', 'DATE');
        await question(profileSection.id, 4, 'Qual é a sua faixa de renda mensal?', 'SINGLE_CHOICE', { isRequired: true }, [
            'Até 1 salário mínimo',
            'De 1 a 3 salários mínimos',
            'De 3 a 6 salários mínimos',
            'Acima de 6 salários mínimos',
        ]);

        await question(experienceSection.id, 1, 'Você recomendaria a loja a um amigo?', 'YES_NO', { isRequired: true });
        await question(experienceSection.id, 2, 'Como avalia o atendimento?', 'SCALE_1_5', {
            isRequired: true,
            scaleLeftLabel: 'Muito ruim',
            scaleRightLabel: 'Excelente',
        });
        await question(experienceSection.id, 3, 'O que mais você valoriza ao comprar?', 'MULTIPLE_CHOICE', { minSelections: 1, maxSelections: 3 }, [
            'Preço',
            'Qualidade',
            'Atendimento',
            'Variedade',
            'Localização',
        ]);
        await question(experienceSection.id, 4, 'Em que horário costuma comprar?', 'TIME');
        await question(experienceSection.id, 5, 'Local da entrevista', 'LOCATION');
        await question(experienceSection.id, 6, 'Deixe uma sugestão para a loja', 'FREE_TEXT', { maxLength: 300 });
    }

    // Lê de volta as questões (também quando a pesquisa já existia) na ordem do questionário.
    const sections = (await orm.Section.where({ researchId: research.id }).all()).sort((a, b) => a.order - b.order);
    const loaded: SeededQuestion[] = [];
    for (const section of sections) {
        const questions = (await orm.Question.where({ sectionId: section.id }).all()).sort((a, b) => a.order - b.order);
        for (const q of questions) {
            const options = (await orm.QuestionOption.where({ questionId: q.id }).all())
                .sort((a, b) => a.order - b.order)
                .map((o) => ({ id: o.id, text: o.text }));
            loaded.push({ id: q.id, options, isRequired: q.isRequired });
        }
    }

    const keys: QuestionKey[] = ['name', 'age', 'lastPurchase', 'income', 'recommend', 'service', 'values', 'shoppingTime', 'location', 'suggestion'];
    if (loaded.length < keys.length) {
        throw new Error('A pesquisa do seed existe, mas está incompleta. Apague-a e rode o seed novamente.');
    }
    const questions = Object.fromEntries(keys.map((key, index) => [key, loaded[index]])) as Record<QuestionKey, SeededQuestion>;
    return { id: research.id, questions };
}

// Gera o texto da resposta no mesmo formato que o aplicativo envia.
function buildAnswers(q: Record<QuestionKey, SeededQuestion>, startedAt: Date): { questionId: number; value: string }[] {
    const answers: { questionId: number; value: string }[] = [];
    const add = (question: SeededQuestion, value: string, optionalChance = 1) => {
        // Pergunta obrigatória sempre respondida; as demais, às vezes ficam em branco.
        if (question.isRequired || chance(optionalChance)) answers.push({ questionId: question.id, value });
    };

    add(q.name, `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`);
    add(q.age, String(between(16, 78)));

    const lastPurchase = new Date(startedAt.getTime() - between(0, 45) * 86_400_000);
    add(q.lastPurchase, lastPurchase.toISOString().slice(0, 10), 0.85);

    add(q.income, String(pick(q.income.options).id));
    add(q.recommend, chance(0.78) ? 'YES' : 'NO');
    // Notas puxadas para o lado positivo, para o painel ficar com cara de pesquisa real.
    add(q.service, String(pick([1, 2, 3, 3, 4, 4, 4, 5, 5, 5])));

    const chosen = [...q.values.options].sort(() => random() - 0.5).slice(0, between(1, 3));
    add(q.values, JSON.stringify(chosen.map((o) => o.id)), 0.9);

    const hour = String(between(8, 20)).padStart(2, '0');
    const minute = String(pick([0, 10, 15, 20, 30, 40, 45, 50])).padStart(2, '0');
    add(q.shoppingTime, `${hour}:${minute}`, 0.8);

    // Em torno de Santa Cruz da Baixa Verde (PE).
    add(
        q.location,
        JSON.stringify({
            latitude: Number((-7.8167 + (random() - 0.5) * 0.04).toFixed(6)),
            longitude: Number((-38.1456 + (random() - 0.5) * 0.04).toFixed(6)),
            accuracy: between(4, 35),
            lowAccuracy: false,
        }),
        0.95,
    );

    add(q.suggestion, pick(SUGGESTIONS), 0.5);
    return answers;
}

async function main() {
    console.log('Iniciando seed de demonstração...');
    const orm = db.orm.public;
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const company = await ensureCompany();
    const admin = await ensureUser(ADMIN, 'ADMINISTRATOR', company.id, passwordHash);
    const researchers = [];
    for (const data of RESEARCHERS) researchers.push(await ensureUser(data, 'RESEARCHER', company.id, passwordHash));

    const research = await ensureResearch(company.id);

    for (const researcher of researchers) {
        const link = await orm.ResearchResearcher.where({ researchId: research.id, userId: researcher.id }).first();
        if (!link) await orm.ResearchResearcher.create({ researchId: research.id, userId: researcher.id });
    }

    let created = 0;
    let skipped = 0;
    const now = Date.now();

    for (let n = 1; n <= TOTAL_COLLECTIONS; n++) {
        const researcher = researchers[(n - 1) % researchers.length];
        const clientId = `seed-${n}`;

        const existing = await orm.Collection.where({ researcherId: researcher.id, clientId }).first();
        if (existing) {
            skipped++;
            continue;
        }

        // Espalha as coletas pelos últimos 14 dias, em horário comercial.
        const startedAt = new Date(now - between(0, 14) * 86_400_000);
        startedAt.setHours(between(8, 19), between(0, 59), between(0, 59), 0);
        if (startedAt.getTime() > now) startedAt.setTime(now - between(10, 120) * 60_000);
        const finishedAt = new Date(startedAt.getTime() + between(3, 14) * 60_000);

        const collection = await orm.Collection.create({
            researchId: research.id,
            researcherId: researcher.id,
            deviceId: `seed-device-${(n % researchers.length) + 1}`,
            clientId,
            startedAt: startedAt.toISOString(),
            finishedAt: finishedAt.toISOString(),
            consentGiven: false,
            consentAt: null,
            consentConfirmedById: null,
            audioPath: null,
            audioMimeType: null,
            audioSizeBytes: null,
            audioDurationSeconds: null,
        });

        for (const answer of buildAnswers(research.questions, startedAt)) {
            await orm.Answer.create({ questionId: answer.questionId, value: answer.value, collectionId: collection.id });
        }
        created++;
    }

    console.log(`Coletas criadas: ${created} (já existiam: ${skipped}).`);
    console.log(`Empresa: ${COMPANY_NAME}`);
    console.log(`Administrador: ${admin.username} / ${DEMO_PASSWORD}`);
    console.log(`Pesquisadores: ${RESEARCHERS.map((r) => r.username).join(', ')} (senha: ${DEMO_PASSWORD})`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
