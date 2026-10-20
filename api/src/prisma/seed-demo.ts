import { db } from './db.js';
import * as bcrypt from 'bcrypt';

// Seed de demonstração: cria (se ainda não existirem) uma empresa, um administrador, pesquisadores e um
// CATÁLOGO de pesquisas completas (questionários, regras de exibição, pesquisadores vinculados) e
// insere coletas com respostas variadas em cada pesquisa que estiver em campo ou encerrada.
//
// Pesquisas criadas (ver `RESEARCHES` mais abaixo):
//   1. Satisfação dos clientes do varejo   (IN_FIELD)  -> 100 coletas (ajustável com SEED_COLLECTIONS)
//   2. Mobilidade urbana                   (IN_FIELD)  ->  60 coletas, com regras de exibição
//   3. Atendimento nas unidades de saúde   (CLOSED)    ->  45 coletas, com regra de exibição
//   4. Consumo de energia nas residências  (PUBLISHED) ->  sem coletas (ainda não iniciada)
//   5. Eventos culturais da cidade         (DRAFT)     ->  sem coletas, sem pesquisadores (rascunho)
//
// Uso (na pasta api):  npx tsx src/prisma/seed-demo.ts
// Outra quantidade na pesquisa 1:  SEED_COLLECTIONS=250 npx tsx src/prisma/seed-demo.ts
//   (PowerShell: $env:SEED_COLLECTIONS=250; npx tsx src/prisma/seed-demo.ts)
// npx prisma db update
//
// Pode ser executado mais de uma vez: tudo é identificado por nomes/ids fixos (`seed-...`), então
// uma nova execução só completa o que faltar, sem duplicar.

const RETAIL_COLLECTIONS = Number(process.env.SEED_COLLECTIONS) || 50;
const DEMO_PASSWORD = 'demo123'; //senha do demo.admin e dos pesquisadores demo
const COMPANY_NAME = 'Empresa Demo (seed)';
const DAY = 86_400_000;

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
const weightedPick = <T>(items: T[], weights?: number[]): T => {
    if (!weights || weights.length !== items.length) return pick(items);
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = random() * total;
    for (const [index, item] of items.entries()) {
        roll -= weights[index];
        if (roll < 0) return item;
    }
    return items[items.length - 1];
};

const FIRST_NAMES = ['João', 'Maria', 'José', 'Ana', 'Pedro', 'Juliana', 'Lucas', 'Fernanda', 'Rafael', 'Camila', 'Marcos', 'Patrícia', 'Gabriel', 'Aline', 'Felipe', 'Larissa', 'Rodrigo', 'Beatriz', 'Thiago', 'Vanessa'];
const LAST_NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Nascimento', 'Barbosa', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Araújo'];
const personName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

// ---------------------------------------------------------------------------------------------
// Modelo declarativo das pesquisas
// ---------------------------------------------------------------------------------------------

type QuestionType =
    | 'FREE_TEXT' | 'NUMERIC' | 'DATE' | 'TIME' | 'YES_NO' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'
    | 'SCALE_1_5' | 'PHOTO' | 'MULTIPLE_PHOTOS' | 'LOCATION' | 'AUDIO';

interface QuestionDef {
    key: string; // identificador usado pelas regras e pelo gerador de respostas
    statement: string;
    type: QuestionType;
    required?: boolean;
    extra?: Record<string, unknown>; // minValue, maxLength, scaleLeftLabel, maxFiles...
    options?: string[]; // SINGLE_CHOICE / MULTIPLE_CHOICE
    // --- como gerar as respostas das coletas ---
    optionalChance?: number; // chance de responder quando NÃO é obrigatória (padrão 1)
    weights?: number[]; // pesos das opções (SINGLE_CHOICE)
    pickCount?: [number, number]; // quantas opções marcar (MULTIPLE_CHOICE)
    numeric?: [number, number]; // faixa (NUMERIC)
    yesChance?: number; // chance de "Sim" (YES_NO)
    scalePool?: number[]; // notas possíveis, repetidas para dar peso (SCALE_1_5)
    texts?: string[]; // textos possíveis (FREE_TEXT)
    daysBefore?: number; // DATE: até N dias antes do início da coleta
    hours?: [number, number]; // TIME: faixa de horas
    gen?: () => string; // gerador totalmente personalizado
}

interface SectionDef {
    title: string;
    questions: QuestionDef[];
}

// "A questão `target` só aparece quando `source` recebe `trigger`".
// trigger: 'YES' | 'NO' | nota '1'..'5' | texto da opção (escolha única/múltipla).
interface RuleDef {
    source: string;
    trigger: string;
    target: string;
}

interface ResearchDef {
    slug: string;
    title: string; // identifica a pesquisa (não mude depois de criada)
    description: string;
    objective: string;
    targetAudience: string;
    status: 'DRAFT' | 'PUBLISHED' | 'IN_FIELD' | 'CLOSED';
    startedDaysAgo: number; // início da pesquisa
    endsInDays: number; // fim da pesquisa (negativo = já terminou)
    researchers: string[]; // usernames dos pesquisadores vinculados
    collections: number; // quantidade de coletas (0 = nenhuma)
    collectionWindow: [number, number]; // coletas espalhadas entre "N dias atrás" e "M dias atrás"
    legacyClientIds?: boolean; // clientId `seed-<n>` (pesquisa original) em vez de `seed-<slug>-<n>`
    center: { latitude: number; longitude: number }; // centro das coordenadas das coletas
    sections: SectionDef[];
    rules?: RuleDef[];
}

const SUGGESTIONS_RETAIL = [
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

const SANTA_CRUZ = { latitude: -7.8167, longitude: -38.1456 }; // Santa Cruz da Baixa Verde (PE)

const RESEARCHES: ResearchDef[] = [
    // 1) Pesquisa original do seed (mantida exatamente como era: mesmo título, perguntas e clientIds).
    {
        slug: 'varejo',
        title: 'Satisfação dos clientes do varejo (seed)',
        description: 'Pesquisa de satisfação com clientes do varejo, gerada pelo seed de demonstração.',
        objective: 'Medir a satisfação, o perfil e as sugestões dos clientes da loja.',
        targetAudience: 'Clientes maiores de 16 anos',
        status: 'IN_FIELD',
        startedDaysAgo: 30,
        endsInDays: 30,
        researchers: RESEARCHERS.map((r) => r.username),
        collections: RETAIL_COLLECTIONS,
        collectionWindow: [14, 0],
        legacyClientIds: true,
        center: SANTA_CRUZ,
        sections: [
            {
                title: 'Perfil do entrevistado',
                questions: [
                    { key: 'name', statement: 'Qual é o seu nome?', type: 'FREE_TEXT', required: true, extra: { maxLength: 80 }, gen: personName },
                    { key: 'age', statement: 'Qual é a sua idade?', type: 'NUMERIC', required: true, extra: { minValue: 16, maxValue: 99 }, numeric: [16, 78] },
                    { key: 'lastPurchase', statement: 'Quando foi a sua última compra?', type: 'DATE', daysBefore: 45, optionalChance: 0.85 },
                    {
                        key: 'income', statement: 'Qual é a sua faixa de renda mensal?', type: 'SINGLE_CHOICE', required: true,
                        options: ['Até 1 salário mínimo', 'De 1 a 3 salários mínimos', 'De 3 a 6 salários mínimos', 'Acima de 6 salários mínimos'],
                    },
                ],
            },
            {
                title: 'Experiência de compra',
                questions: [
                    { key: 'recommend', statement: 'Você recomendaria a loja a um amigo?', type: 'YES_NO', required: true, yesChance: 0.78 },
                    {
                        key: 'service', statement: 'Como avalia o atendimento?', type: 'SCALE_1_5', required: true,
                        extra: { scaleLeftLabel: 'Muito ruim', scaleRightLabel: 'Excelente' },
                        // Notas puxadas para o lado positivo, para o painel ficar com cara de pesquisa real.
                        scalePool: [1, 2, 3, 3, 4, 4, 4, 5, 5, 5],
                    },
                    {
                        key: 'values', statement: 'O que mais você valoriza ao comprar?', type: 'MULTIPLE_CHOICE',
                        extra: { minSelections: 1, maxSelections: 3 }, options: ['Preço', 'Qualidade', 'Atendimento', 'Variedade', 'Localização'],
                        pickCount: [1, 3], optionalChance: 0.9,
                    },
                    { key: 'shoppingTime', statement: 'Em que horário costuma comprar?', type: 'TIME', hours: [8, 20], optionalChance: 0.8 },
                    { key: 'location', statement: 'Local da entrevista', type: 'LOCATION', optionalChance: 0.95 },
                    { key: 'suggestion', statement: 'Deixe uma sugestão para a loja', type: 'FREE_TEXT', extra: { maxLength: 300 }, texts: SUGGESTIONS_RETAIL, optionalChance: 0.5 },
                ],
            },
        ],
    },

    // 2) Mobilidade urbana: em campo, com duas regras de exibição.
    {
        slug: 'mobilidade',
        title: 'Mobilidade urbana e transporte (seed)',
        description: 'Levantamento sobre como a população se desloca no dia a dia e o que pode melhorar no transporte local.',
        objective: 'Identificar os meios de transporte mais usados, o tempo de deslocamento e os principais problemas.',
        targetAudience: 'Moradores da sede e da zona rural, maiores de 16 anos',
        status: 'IN_FIELD',
        startedDaysAgo: 21,
        endsInDays: 40,
        researchers: ['demo.ana', 'demo.bruno', 'demo.carla'],
        collections: 60,
        collectionWindow: [18, 0],
        center: { latitude: -7.8180, longitude: -38.1440 },
        sections: [
            {
                title: 'Perfil do morador',
                questions: [
                    {
                        key: 'bairro', statement: 'Em qual região você mora?', type: 'SINGLE_CHOICE', required: true,
                        options: ['Centro', 'Alto do Cruzeiro', 'São Sebastião', 'Distrito industrial', 'Zona rural'], weights: [30, 20, 18, 10, 22],
                    },
                    { key: 'idade', statement: 'Qual é a sua idade?', type: 'NUMERIC', required: true, extra: { minValue: 16, maxValue: 99 }, numeric: [16, 80] },
                    {
                        key: 'ocupacao', statement: 'Qual é a sua ocupação principal?', type: 'SINGLE_CHOICE',
                        options: ['Estudante', 'Trabalhador formal', 'Autônomo', 'Aposentado', 'Desempregado'], weights: [20, 32, 28, 12, 8], optionalChance: 0.9,
                    },
                ],
            },
            {
                title: 'Deslocamento diário',
                questions: [
                    {
                        key: 'meio', statement: 'Qual meio de transporte você mais usa?', type: 'SINGLE_CHOICE', required: true,
                        options: ['A pé', 'Bicicleta', 'Moto', 'Carro', 'Ônibus/Van', 'Mototáxi'], weights: [18, 8, 30, 14, 22, 8],
                    },
                    {
                        key: 'notaTransporte', statement: 'Como avalia o transporte coletivo da cidade?', type: 'SCALE_1_5',
                        extra: { scaleLeftLabel: 'Péssimo', scaleRightLabel: 'Ótimo' }, scalePool: [1, 1, 2, 2, 2, 3, 3, 3, 4, 5],
                    },
                    { key: 'tempo', statement: 'Quantos minutos você leva, em média, no trajeto de ida?', type: 'NUMERIC', required: true, extra: { minValue: 1, maxValue: 240 }, numeric: [5, 90] },
                    { key: 'usaApp', statement: 'Você usa aplicativo de transporte?', type: 'YES_NO', required: true, yesChance: 0.3 },
                    {
                        key: 'qualApp', statement: 'Qual aplicativo ou serviço você usa?', type: 'FREE_TEXT', extra: { maxLength: 80 },
                        texts: ['Uber', '99', 'Táxi por aplicativo', 'WhatsApp do mototaxista', 'Aplicativo de moto local'],
                    },
                    {
                        key: 'problemas', statement: 'Quais são os maiores problemas do trânsito e do transporte?', type: 'MULTIPLE_CHOICE',
                        extra: { minSelections: 1, maxSelections: 3 },
                        options: ['Poucos horários de ônibus', 'Ruas mal conservadas', 'Preço da passagem', 'Insegurança', 'Falta de ciclovias', 'Falta de acessibilidade'],
                        pickCount: [1, 3], optionalChance: 0.92,
                    },
                    { key: 'horarioPico', statement: 'Em que horário você mais se desloca?', type: 'TIME', hours: [6, 18], optionalChance: 0.85 },
                    { key: 'local', statement: 'Local da entrevista', type: 'LOCATION', optionalChance: 0.95 },
                    {
                        key: 'sugestao', statement: 'O que a prefeitura poderia fazer para melhorar a mobilidade?', type: 'FREE_TEXT', extra: { maxLength: 300 }, optionalChance: 0.45,
                        texts: [
                            'Consertar as estradas da zona rural.', 'Colocar mais horários de van nos finais de semana.', 'Fazer faixas de pedestre e iluminação no centro.',
                            'Criar um ponto de ônibus coberto.', 'Fiscalizar o excesso de velocidade das motos.', 'Construir ciclovias ligando os bairros.',
                        ],
                    },
                ],
            },
        ],
        rules: [
            { source: 'usaApp', trigger: 'YES', target: 'qualApp' },
            { source: 'meio', trigger: 'Ônibus/Van', target: 'notaTransporte' },
        ],
    },

    // 3) Saúde: já encerrada (datas no passado), com uma regra de exibição.
    {
        slug: 'saude',
        title: 'Atendimento nas unidades de saúde (seed)',
        description: 'Pesquisa de opinião sobre o atendimento recebido nas unidades básicas de saúde do município.',
        objective: 'Medir o tempo de espera, a qualidade do atendimento e a disponibilidade de medicamentos.',
        targetAudience: 'Usuários atendidos nas unidades de saúde nos últimos 30 dias',
        status: 'CLOSED',
        startedDaysAgo: 75,
        endsInDays: -15,
        researchers: ['demo.diego', 'demo.elisa', 'demo.ana'],
        collections: 45,
        collectionWindow: [70, 18],
        center: { latitude: -7.8150, longitude: -38.1470 },
        sections: [
            {
                title: 'Atendimento recebido',
                questions: [
                    {
                        key: 'unidade', statement: 'Em qual unidade você foi atendido?', type: 'SINGLE_CHOICE', required: true,
                        options: ['UBS Centro', 'UBS Alto do Cruzeiro', 'UBS Zona Rural', 'Policlínica Municipal'], weights: [35, 25, 15, 25],
                    },
                    { key: 'dataAtendimento', statement: 'Quando foi o atendimento?', type: 'DATE', daysBefore: 25, optionalChance: 0.9 },
                    { key: 'espera', statement: 'Quantos minutos você esperou para ser atendido?', type: 'NUMERIC', required: true, extra: { minValue: 0, maxValue: 480 }, numeric: [5, 180] },
                    {
                        key: 'atendimento', statement: 'Como avalia o atendimento dos profissionais?', type: 'SCALE_1_5', required: true,
                        extra: { scaleLeftLabel: 'Muito ruim', scaleRightLabel: 'Excelente' }, scalePool: [1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5],
                    },
                    { key: 'medicamento', statement: 'Você conseguiu receber os medicamentos receitados?', type: 'YES_NO', required: true, yesChance: 0.62 },
                    {
                        key: 'motivoFalta', statement: 'Por que não recebeu o medicamento?', type: 'SINGLE_CHOICE',
                        options: ['Medicamento em falta', 'Receita não aceita', 'Não havia farmácia aberta', 'Outro motivo'], weights: [55, 15, 20, 10],
                    },
                ],
            },
            {
                title: 'Estrutura e melhorias',
                questions: [
                    {
                        key: 'limpeza', statement: 'Como avalia a limpeza e a conservação da unidade?', type: 'SCALE_1_5',
                        extra: { scaleLeftLabel: 'Muito ruim', scaleRightLabel: 'Excelente' }, scalePool: [2, 3, 3, 4, 4, 4, 5, 5], optionalChance: 0.95,
                    },
                    {
                        key: 'melhorar', statement: 'O que deveria melhorar primeiro?', type: 'MULTIPLE_CHOICE', extra: { minSelections: 1, maxSelections: 2 },
                        options: ['Tempo de espera', 'Limpeza', 'Atendimento da recepção', 'Número de médicos', 'Horário de funcionamento'], pickCount: [1, 2], optionalChance: 0.9,
                    },
                    { key: 'local', statement: 'Local da entrevista', type: 'LOCATION', optionalChance: 0.9 },
                    {
                        key: 'comentario', statement: 'Quer deixar algum comentário?', type: 'FREE_TEXT', extra: { maxLength: 300 }, optionalChance: 0.4,
                        texts: [
                            'Os profissionais são atenciosos, mas faltam médicos.', 'Chego cedo e mesmo assim espero muito.', 'Faltou o remédio de pressão de novo.',
                            'A unidade está mais organizada do que antes.', 'Precisava de atendimento aos sábados.', 'Atendimento excelente, sem reclamações.',
                        ],
                    },
                ],
            },
        ],
        rules: [{ source: 'medicamento', trigger: 'NO', target: 'motivoFalta' }],
    },

    // 4) Publicada, mas ainda sem coletas (o app já pode baixá-la).
    {
        slug: 'energia',
        title: 'Consumo de energia nas residências (seed)',
        description: 'Pesquisa sobre o consumo de energia elétrica e o interesse em energia solar entre as famílias.',
        objective: 'Estimar o gasto médio com energia e o potencial de adesão à energia solar.',
        targetAudience: 'Responsáveis por domicílios urbanos e rurais',
        status: 'PUBLISHED',
        startedDaysAgo: 2,
        endsInDays: 60,
        researchers: ['demo.bruno', 'demo.carla'],
        collections: 0,
        collectionWindow: [0, 0],
        center: SANTA_CRUZ,
        sections: [
            {
                title: 'Domicílio',
                questions: [
                    { key: 'moradores', statement: 'Quantas pessoas moram na casa?', type: 'NUMERIC', required: true, extra: { minValue: 1, maxValue: 15 }, numeric: [1, 9] },
                    { key: 'moradia', statement: 'Qual é o tipo de moradia?', type: 'SINGLE_CHOICE', required: true, options: ['Casa própria', 'Casa alugada', 'Apartamento', 'Sítio ou chácara'] },
                ],
            },
            {
                title: 'Consumo e energia solar',
                questions: [
                    {
                        key: 'conta', statement: 'Qual é o valor médio da sua conta de luz?', type: 'SINGLE_CHOICE', required: true,
                        options: ['Até R$ 80', 'De R$ 80 a R$ 150', 'De R$ 150 a R$ 300', 'Acima de R$ 300'],
                    },
                    { key: 'possuiSolar', statement: 'Você já tem painéis de energia solar?', type: 'YES_NO', required: true },
                    { key: 'interesseSolar', statement: 'Você teria interesse em instalar energia solar?', type: 'YES_NO' },
                    {
                        key: 'obstaculo', statement: 'Qual é o maior obstáculo para instalar?', type: 'SINGLE_CHOICE',
                        options: ['Custo inicial', 'Falta de informação', 'Imóvel alugado', 'Não vejo vantagem'],
                    },
                    { key: 'obs', statement: 'Observações do pesquisador', type: 'FREE_TEXT', extra: { maxLength: 300 } },
                ],
            },
        ],
        rules: [
            { source: 'possuiSolar', trigger: 'NO', target: 'interesseSolar' },
            { source: 'interesseSolar', trigger: 'NO', target: 'obstaculo' },
        ],
    },

    // 5) Rascunho: sem pesquisadores e sem coletas; mostra também os tipos de mídia (foto, fotos, áudio).
    {
        slug: 'cultura',
        title: 'Eventos culturais da cidade (seed)',
        description: 'Rascunho de pesquisa sobre o interesse da população em eventos culturais e festas tradicionais.',
        objective: 'Descobrir quais eventos o público mais valoriza e com que frequência participa.',
        targetAudience: 'Moradores a partir de 14 anos',
        status: 'DRAFT',
        startedDaysAgo: 0,
        endsInDays: 90,
        researchers: [],
        collections: 0,
        collectionWindow: [0, 0],
        center: SANTA_CRUZ,
        sections: [
            {
                title: 'Perfil',
                questions: [
                    { key: 'nome', statement: 'Qual é o seu nome?', type: 'FREE_TEXT', required: true, extra: { maxLength: 80 } },
                    { key: 'idade', statement: 'Qual é a sua idade?', type: 'NUMERIC', required: true, extra: { minValue: 14, maxValue: 99 } },
                ],
            },
            {
                title: 'Eventos e participação',
                questions: [
                    {
                        key: 'tipos', statement: 'De quais tipos de evento você mais gosta?', type: 'MULTIPLE_CHOICE', extra: { minSelections: 1, maxSelections: 3 },
                        options: ['Festa junina', 'Show musical', 'Teatro', 'Feira gastronômica', 'Cinema ao ar livre'],
                    },
                    {
                        key: 'frequencia', statement: 'Com que frequência você participa de eventos?', type: 'SINGLE_CHOICE',
                        options: ['Nunca', 'Algumas vezes por ano', 'Uma vez por mês', 'Toda semana'],
                    },
                    { key: 'nota', statement: 'Como avalia a programação cultural atual?', type: 'SCALE_1_5', extra: { scaleLeftLabel: 'Fraca', scaleRightLabel: 'Muito boa' } },
                    { key: 'foto', statement: 'Foto do local do evento', type: 'PHOTO', extra: { maxFiles: 1 } },
                    { key: 'fotos', statement: 'Fotos da estrutura (até 3)', type: 'MULTIPLE_PHOTOS', extra: { maxFiles: 3 } },
                    { key: 'depoimento', statement: 'Depoimento em áudio', type: 'AUDIO', extra: { maxDuration: 60 } },
                ],
            },
        ],
    },
];

// ---------------------------------------------------------------------------------------------
// Empresa e usuários
// ---------------------------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------------------------
// Pesquisa: criação e leitura de volta
// ---------------------------------------------------------------------------------------------

interface SeededQuestion {
    id: number;
    key: string;
    def: QuestionDef;
    options: { id: number; text: string }[];
    isRequired: boolean;
}

interface SeededResearch {
    id: number;
    def: ResearchDef;
    questions: SeededQuestion[]; // na ordem do questionário
    rules: { sourceKey: string; targetKey: string; triggerValue: string }[];
}

async function ensureResearch(def: ResearchDef, companyId: number): Promise<SeededResearch> {
    const orm = db.orm.public;
    let research = await orm.Research.where({ companyId, title: def.title }).first();

    if (!research) {
        research = await orm.Research.create({
            title: def.title,
            description: def.description,
            objective: def.objective,
            startDate: new Date(Date.now() - def.startedDaysAgo * DAY).toISOString(),
            endDate: new Date(Date.now() + def.endsInDays * DAY).toISOString(),
            targetAudience: def.targetAudience,
            status: def.status,
            recordInterview: false,
            companyId,
        });

        for (const [sectionIndex, sectionDef] of def.sections.entries()) {
            const section = await orm.Section.create({ title: sectionDef.title, order: sectionIndex + 1, researchId: research.id });

            for (const [questionIndex, q] of sectionDef.questions.entries()) {
                const created = await orm.Question.create({
                    statement: q.statement,
                    type: q.type as never,
                    isRequired: q.required ?? false,
                    order: questionIndex + 1,
                    sectionId: section.id,
                    ...(q.extra ?? {}),
                } as never);
                for (const [optionIndex, text] of (q.options ?? []).entries()) {
                    await orm.QuestionOption.create({ text, order: optionIndex + 1, questionId: created.id });
                }
            }
        }
    }

    // Lê de volta as questões (também quando a pesquisa já existia) na ordem do questionário.
    const sections = (await orm.Section.where({ researchId: research.id }).all()).sort((a, b) => a.order - b.order);
    const loaded: { id: number; options: { id: number; text: string }[]; isRequired: boolean }[] = [];
    for (const section of sections) {
        const questions = (await orm.Question.where({ sectionId: section.id }).all()).sort((a, b) => a.order - b.order);
        for (const q of questions) {
            const options = (await orm.QuestionOption.where({ questionId: q.id }).all())
                .sort((a, b) => a.order - b.order)
                .map((o) => ({ id: o.id, text: o.text }));
            loaded.push({ id: q.id, options, isRequired: q.isRequired });
        }
    }

    const defs = def.sections.flatMap((s) => s.questions);
    if (loaded.length < defs.length) {
        throw new Error(`A pesquisa "${def.title}" existe, mas está incompleta. Apague-a e rode o seed novamente.`);
    }
    const questions: SeededQuestion[] = defs.map((d, index) => ({ ...loaded[index], key: d.key, def: d }));
    const byKey = new Map(questions.map((q) => [q.key, q]));

    // Regras de exibição (criadas só se ainda não existirem).
    const rules: SeededResearch['rules'] = [];
    for (const rule of def.rules ?? []) {
        const source = byKey.get(rule.source);
        const target = byKey.get(rule.target);
        if (!source || !target) throw new Error(`Regra inválida em "${def.title}": ${rule.source} -> ${rule.target}`);

        let triggerValue = rule.trigger;
        if (source.def.type === 'SINGLE_CHOICE' || source.def.type === 'MULTIPLE_CHOICE') {
            const option = source.options.find((o) => o.text === rule.trigger);
            if (!option) throw new Error(`Opção "${rule.trigger}" não existe na questão "${source.def.statement}".`);
            triggerValue = String(option.id);
        }

        const existing = await orm.QuestionRule.where({
            researchId: research.id,
            sourceQuestionId: source.id,
            targetQuestionId: target.id,
            triggerValue,
        }).first();
        if (!existing) {
            await orm.QuestionRule.create({
                researchId: research.id,
                sourceQuestionId: source.id,
                triggerValue,
                targetQuestionId: target.id,
            });
        }
        rules.push({ sourceKey: rule.source, targetKey: rule.target, triggerValue });
    }

    return { id: research.id, def, questions, rules };
}

// ---------------------------------------------------------------------------------------------
// Respostas
// ---------------------------------------------------------------------------------------------

// Gera o texto da resposta no mesmo formato que o aplicativo envia.
function generateValue(q: SeededQuestion, startedAt: Date, center: ResearchDef['center']): string | null {
    const d = q.def;
    if (d.gen) return d.gen();

    switch (d.type) {
        case 'FREE_TEXT':
            return d.texts ? pick(d.texts) : null;
        case 'NUMERIC':
            return String(between(...(d.numeric ?? [1, 10])));
        case 'DATE':
            return new Date(startedAt.getTime() - between(0, d.daysBefore ?? 30) * DAY).toISOString().slice(0, 10);
        case 'TIME': {
            const [from, to] = d.hours ?? [8, 20];
            const hour = String(between(from, to)).padStart(2, '0');
            const minute = String(pick([0, 10, 15, 20, 30, 40, 45, 50])).padStart(2, '0');
            return `${hour}:${minute}`;
        }
        case 'YES_NO':
            return chance(d.yesChance ?? 0.5) ? 'YES' : 'NO';
        case 'SCALE_1_5':
            return String(pick(d.scalePool ?? [1, 2, 3, 4, 5]));
        case 'SINGLE_CHOICE':
            return String(weightedPick(q.options, d.weights).id);
        case 'MULTIPLE_CHOICE': {
            const [min, max] = d.pickCount ?? [1, 2];
            const chosen = [...q.options].sort(() => random() - 0.5).slice(0, between(min, max));
            return JSON.stringify(chosen.map((o) => o.id));
        }
        case 'LOCATION':
            return JSON.stringify({
                latitude: Number((center.latitude + (random() - 0.5) * 0.04).toFixed(6)),
                longitude: Number((center.longitude + (random() - 0.5) * 0.04).toFixed(6)),
                accuracy: between(4, 35),
                lowAccuracy: false,
            });
        default:
            return null; // PHOTO, MULTIPLE_PHOTOS e AUDIO dependem de arquivos: o seed não gera.
    }
}

function ruleMatches(sourceType: QuestionType, answer: string | undefined, triggerValue: string): boolean {
    if (answer === undefined) return false;
    if (sourceType === 'MULTIPLE_CHOICE') {
        try {
            return (JSON.parse(answer) as unknown[]).map(String).includes(triggerValue);
        } catch {
            return false;
        }
    }
    return answer === triggerValue;
}

function buildAnswers(research: SeededResearch, startedAt: Date): { questionId: number; value: string }[] {
    const answers: { questionId: number; value: string }[] = [];
    const given = new Map<string, string>(); // key -> valor respondido
    const typeByKey = new Map(research.questions.map((q) => [q.key, q.def.type]));

    for (const question of research.questions) {
        // Questão afetada por regra: só é respondida se alguma regra dela foi disparada.
        const incoming = research.rules.filter((r) => r.targetKey === question.key);
        if (incoming.length > 0) {
            const visible = incoming.some((r) => ruleMatches(typeByKey.get(r.sourceKey)!, given.get(r.sourceKey), r.triggerValue));
            if (!visible) continue;
        }

        // Pergunta obrigatória sempre respondida; as demais, às vezes ficam em branco.
        if (!question.isRequired && !chance(question.def.optionalChance ?? 1)) continue;

        const value = generateValue(question, startedAt, research.def.center);
        if (value === null) continue;
        given.set(question.key, value);
        answers.push({ questionId: question.id, value });
    }
    return answers;
}

// ---------------------------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------------------------

async function seedCollections(research: SeededResearch, researchers: { id: number; username: string }[]) {
    const orm = db.orm.public;
    const { def } = research;
    const team = researchers.filter((r) => def.researchers.includes(r.username));
    let created = 0;
    let skipped = 0;
    if (def.collections === 0 || team.length === 0) return { created, skipped };

    const now = Date.now();
    const [fromDaysAgo, toDaysAgo] = def.collectionWindow;

    for (let n = 1; n <= def.collections; n++) {
        const researcher = team[(n - 1) % team.length];
        const clientId = def.legacyClientIds ? `seed-${n}` : `seed-${def.slug}-${n}`;

        const existing = await orm.Collection.where({ researcherId: researcher.id, clientId }).first();
        if (existing) {
            skipped++;
            continue;
        }

        // Espalha as coletas pela janela da pesquisa, em horário comercial.
        const startedAt = new Date(now - between(toDaysAgo, fromDaysAgo) * DAY);
        startedAt.setHours(between(8, 19), between(0, 59), between(0, 59), 0);
        if (startedAt.getTime() > now) startedAt.setTime(now - between(10, 120) * 60_000);
        const finishedAt = new Date(startedAt.getTime() + between(3, 14) * 60_000);

        const collection = await orm.Collection.create({
            researchId: research.id,
            researcherId: researcher.id,
            deviceId: `seed-device-${(n % team.length) + 1}`,
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

        for (const answer of buildAnswers(research, startedAt)) {
            await orm.Answer.create({ questionId: answer.questionId, value: answer.value, collectionId: collection.id });
        }
        created++;
    }
    return { created, skipped };
}

async function main() {
    console.log('Iniciando seed de demonstração...');
    const orm = db.orm.public;
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const company = await ensureCompany();
    const admin = await ensureUser(ADMIN, 'ADMINISTRATOR', company.id, passwordHash);
    const researchers: { id: number; username: string }[] = [];
    for (const data of RESEARCHERS) researchers.push(await ensureUser(data, 'RESEARCHER', company.id, passwordHash));

    console.log('');
    for (const def of RESEARCHES) {
        const research = await ensureResearch(def, company.id);

        // Vincula à pesquisa os pesquisadores definidos para ela.
        for (const researcher of researchers.filter((r) => def.researchers.includes(r.username))) {
            const link = await orm.ResearchResearcher.where({ researchId: research.id, userId: researcher.id }).first();
            if (!link) await orm.ResearchResearcher.create({ researchId: research.id, userId: researcher.id });
        }

        const { created, skipped } = await seedCollections(research, researchers);
        console.log(`• ${def.title} [${def.status}] -> coletas criadas: ${created} (já existiam: ${skipped}).`);
    }

    console.log('');
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