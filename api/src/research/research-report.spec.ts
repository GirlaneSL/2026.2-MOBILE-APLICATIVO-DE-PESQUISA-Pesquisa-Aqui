import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResearchReportService } from './research-report.service';
import { ResearchService } from './research.service';
import { csvCell } from './research-report';

type Row = Record<string, any>;

function makeDb(tables: Record<string, Row[]>) {
  const model = (name: string) => ({
    // Aceita { campo: valor } e também (linha) => linha.campo.in(lista), como o ORM de verdade.
    where: (filter: Row | ((column: any) => (row: Row) => boolean)) => {
      const columns = new Proxy({}, { get: (_t, key: string) => ({ in: (list: unknown[]) => (row: Row) => list.includes(row[key]) }) });
      const test: (row: Row) => boolean =
        typeof filter === 'function' ? (filter as any)(columns) : (r) => Object.entries(filter).every(([k, v]) => r[k] === v);
      const match = () => (tables[name] ?? []).filter(test);
      return {
        first: async () => match()[0] ?? null,
        all: async () => match(),
        update: async (data: Row) => {
          const row = match()[0];
          Object.assign(row, data);
          return row;
        },
      };
    },
  });
  const orm = { public: new Proxy({}, { get: (_t, name: string) => model(name) }) };
  return { client: { orm } } as any;
}

const at = (h: number, m = 0) => `2026-10-10T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;

function seed() {
  return {
    Company: [{ id: 10 }, { id: 20 }],
    User: [
      { id: 1, name: 'Paula', username: 'paula', profile: 'RESEARCHER', companyId: 10 },
      { id: 2, name: 'Rui', username: 'rui', profile: 'RESEARCHER', companyId: 10 },
      { id: 3, name: 'Ana', username: 'ana', profile: 'RESEARCHER', companyId: 10 },
      { id: 9, name: 'Estranho', username: 'estranho', profile: 'RESEARCHER', companyId: 20 },
    ],
    Research: [
      { id: 5, title: 'Satisfação', companyId: 10, status: 'IN_FIELD', updatedAt: '2026-10-20T10:00:00.000Z' },
      { id: 6, title: 'Outra empresa', companyId: 20, status: 'IN_FIELD' },
    ],
    ResearchResearcher: [
      { id: 1, researchId: 5, userId: 1, targetCount: 4 },
      { id: 2, researchId: 5, userId: 2, targetCount: 4 },
      { id: 3, researchId: 5, userId: 3, targetCount: null },
    ],
    Section: [{ id: 50, researchId: 5, title: 'A', order: 1 }],
    Question: [
      { id: 100, sectionId: 50, statement: 'Voltaria?', type: 'YES_NO', order: 1 },
      { id: 101, sectionId: 50, statement: 'Cor favorita', type: 'SINGLE_CHOICE', order: 2 },
      { id: 102, sectionId: 50, statement: 'Comentário', type: 'FREE_TEXT', order: 3 },
      { id: 103, sectionId: 50, statement: 'Canais', type: 'MULTIPLE_CHOICE', order: 4 },
    ],
    QuestionOption: [
      { id: 1, questionId: 101, text: 'Verde', order: 1 },
      { id: 2, questionId: 101, text: 'Azul', order: 2 },
      { id: 3, questionId: 103, text: 'Site', order: 1 },
      { id: 4, questionId: 103, text: 'Loja', order: 2 },
    ],
    // Paula: 3 coletas de 10 min. Rui: 3 coletas de 4 min. Ana: 0. Estranho (outra empresa) tem coleta em outra pesquisa.
    Collection: [
      { id: 1, researchId: 5, researcherId: 1, startedAt: at(9), finishedAt: at(9, 10), receivedAt: at(12) },
      { id: 2, researchId: 5, researcherId: 1, startedAt: at(10), finishedAt: at(10, 10), receivedAt: at(12) },
      { id: 3, researchId: 5, researcherId: 1, startedAt: '2026-10-11T10:00:00.000Z', finishedAt: '2026-10-11T10:10:00.000Z', receivedAt: at(13) },
      { id: 4, researchId: 5, researcherId: 2, startedAt: at(11), finishedAt: at(11, 4), receivedAt: at(14) },
      { id: 5, researchId: 5, researcherId: 2, startedAt: at(12), finishedAt: at(12, 4), receivedAt: at(14) },
      { id: 6, researchId: 5, researcherId: 2, startedAt: at(13), finishedAt: at(13, 4), receivedAt: at(14) },
      { id: 7, researchId: 6, researcherId: 9, startedAt: at(9), finishedAt: at(9, 30), receivedAt: at(15) },
    ],
    Answer: [
      { id: 1, questionId: 100, collectionId: 1, value: 'YES' },
      { id: 2, questionId: 100, collectionId: 2, value: 'YES' },
      { id: 3, questionId: 100, collectionId: 3, value: 'NO' },
      { id: 4, questionId: 100, collectionId: 4, value: 'NO' },
      { id: 5, questionId: 101, collectionId: 1, value: '1' },
      { id: 6, questionId: 101, collectionId: 4, value: '2' },
      { id: 7, questionId: 102, collectionId: 1, value: '=HYPERLINK("http://x")' },
      { id: 8, questionId: 103, collectionId: 1, value: '[3,4]' },
      { id: 9, questionId: 103, collectionId: 2, value: '[3]' },
      { id: 10, questionId: 100, collectionId: 7, value: 'YES' },
    ],
    SyncLog: [
      { id: 1, researcherId: 1, receivedAt: at(8) },
      { id: 2, researcherId: 1, receivedAt: at(13) },
      { id: 3, researcherId: 2, receivedAt: at(14) },
    ],
  };
}

const admin = { sub: 'admin', profile: 'ADMINISTRATOR', companyId: 10 } as any;
const otherAdmin = { sub: 'adm2', profile: 'ADMINISTRATOR', companyId: 20 } as any;

describe('ResearchReportService', () => {
  const service = () => new ResearchReportService({ client: makeDb(seed()).client } as any);

  it('painel: total, por pesquisador, % da meta, última sincronização e tempo médio', async () => {
    const panel = await service().panel(5, {}, admin);

    expect(panel.totalCollections).toBe(6);
    expect(panel.targetTotal).toBe(8);
    expect(panel.goalPercent).toBe(75); // Paula 3/4 + Rui 3/4 = 6/8
  });

  it('painel: números por pesquisador, inclusive quem não entregou nada', async () => {
    const panel = await service().panel(5, {}, admin);
    const by = Object.fromEntries(panel.researchers.map((r) => [r.name, r]));

    expect(by.Paula).toMatchObject({ collected: 3, targetCount: 4, progress: 75, lastSyncAt: at(13), averageSeconds: 600, suspiciouslyFast: false });
    expect(by.Rui).toMatchObject({ collected: 3, progress: 75, lastSyncAt: at(14), averageSeconds: 240, suspiciouslyFast: true });
    expect(by.Ana).toMatchObject({ collected: 0, progress: null, lastSyncAt: null, averageSeconds: null });
    expect(panel.averageSeconds).toBe(420);
    expect(panel.lastSyncAt).toBe(at(14));
  });

  it('filtra por pesquisador e por período, no painel e no relatório', async () => {
    const svc = service();
    const byResearcher = await svc.panel(5, { researcherId: 2 }, admin);
    expect(byResearcher.totalCollections).toBe(3);
    expect(byResearcher.researchers.map((r) => r.name)).toEqual(['Rui']);

    const onlyDay11 = await svc.panel(5, { from: '2026-10-11', to: '2026-10-11' }, admin);
    expect(onlyDay11.totalCollections).toBe(1);

    const report = await svc.report(5, { researcherId: 1 }, admin);
    const yesNo = report.questions.find((q) => q.questionId === 100)!;
    expect(yesNo.data.find((d) => d.key === 'YES')!.count).toBe(2);
    expect(yesNo.data.find((d) => d.key === 'NO')!.count).toBe(1);
  });

  it('relatório: só questões de escolha e sim/não, com contagem e percentual', async () => {
    const report = await service().report(5, {}, admin);
    expect(report.questions.map((q) => q.statement)).toEqual(['Voltaria?', 'Cor favorita', 'Canais']);

    const yesNo = report.questions[0];
    expect(yesNo.answered).toBe(4);
    expect(yesNo.data).toEqual([
      { key: 'YES', label: 'Sim', count: 2, percent: 50 },
      { key: 'NO', label: 'Não', count: 2, percent: 50 },
    ]);

    const color = report.questions[1];
    expect(color.data.map((d) => [d.label, d.count])).toEqual([['Verde', 1], ['Azul', 1]]);

    const channels = report.questions[2];
    expect(channels.data.map((d) => [d.label, d.count, d.percent])).toEqual([['Site', 2, 100], ['Loja', 1, 50]]);
  });

  it('CSV: uma linha por coleta, uma coluna por questão, fórmula neutralizada', async () => {
    const { content, fileName } = await service().exportCsv(5, {}, admin);
    const lines = content.replace('﻿', '').trim().split('\r\n');

    expect(fileName).toBe('pesquisa-5-coletas.csv');
    expect(lines).toHaveLength(1 + 6);
    expect(lines[0]).toBe('Coleta;Pesquisador;Início;Fim;Duração (segundos);Recebida em;Voltaria?;Cor favorita;Comentário;Canais');
    expect(lines[1]).toBe(`1;Paula;${at(9)};${at(9, 10)};600;${at(12)};Sim;Verde;'=HYPERLINK("http://x");Site | Loja`.replace("'=HYPERLINK(\"http://x\")", '"\'=HYPERLINK(""http://x"")"'));
    expect(content.startsWith('﻿')).toBe(true);

    const filtered = await service().exportCsv(5, { researcherId: 2 }, admin);
    expect(filtered.content.trim().split('\r\n')).toHaveLength(1 + 3);
  });

  it('isolamento: nada de outra empresa, nem por id de pesquisa, nem por filtro de pesquisador', async () => {
    const svc = service();
    for (const call of [
      () => svc.panel(6, {}, admin),
      () => svc.report(6, {}, admin),
      () => svc.exportCsv(6, {}, admin),
      () => svc.panel(5, {}, otherAdmin),
    ]) {
      await expect(call()).rejects.toBeInstanceOf(ForbiddenException);
    }
    // pesquisador de outra empresa não aparece nem é aceito como filtro
    await expect(svc.panel(5, { researcherId: 9 }, admin)).rejects.toBeInstanceOf(NotFoundException);
    const panel = await svc.panel(5, {}, admin);
    expect(panel.researchers.map((r) => r.userId)).not.toContain(9);
  });

  it('só administrador: pesquisador e superadministrador não veem o painel', async () => {
    const svc = service();
    await expect(svc.panel(5, {}, { sub: 'paula', profile: 'RESEARCHER', companyId: 10 } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.panel(5, {}, { sub: 'root', profile: 'SUPERADMINISTRATOR', companyId: null } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('período inválido ou invertido é recusado', async () => {
    const svc = service();
    await expect(svc.panel(5, { from: 'ontem' }, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.panel(5, { from: '2026-10-12', to: '2026-10-10' }, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('pesquisador desvinculado continua contando as coletas que entregou', async () => {
    const data = seed();
    data.ResearchResearcher = data.ResearchResearcher.filter((l) => l.userId !== 2);
    const panel = await new ResearchReportService({ client: makeDb(data).client } as any).panel(5, {}, admin);
    expect(panel.totalCollections).toBe(6);
    expect(panel.researchers.find((r) => r.userId === 2)).toMatchObject({ linked: false, collected: 3 });
  });
});

describe('csvCell', () => {
  it('escapa aspas, separador e quebra de linha; neutraliza fórmula', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell('+55 11')).toBe("'+55 11");
    expect(csvCell(null)).toBe('');
    expect(csvCell(600)).toBe('600');
  });
});

describe('ResearchService.close', () => {
  const setup = (status: string) => {
    const data = { ...seed(), Research: [{ id: 5, title: 'X', companyId: 10, status }] };
    return { data, service: new ResearchService({ client: makeDb(data).client } as any, {} as any) };
  };

  it('encerra pesquisa em campo ou publicada e é idempotente', async () => {
    for (const status of ['IN_FIELD', 'PUBLISHED']) {
      const { data, service } = setup(status);
      await service.close(5, admin);
      expect(data.Research[0].status).toBe('CLOSED');
      await expect(service.close(5, admin)).resolves.toMatchObject({ status: 'CLOSED' });
    }
  });

  it('recusa rascunho, pesquisador e administrador de outra empresa', async () => {
    const { service } = setup('DRAFT');
    await expect(service.close(5, admin)).rejects.toBeInstanceOf(BadRequestException);
    const live = setup('IN_FIELD').service;
    await expect(live.close(5, { sub: 'paula', profile: 'RESEARCHER', companyId: 10 } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(live.close(5, otherAdmin)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
