import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AudioStorage } from './audio-storage';
import { CollectionService } from './collection.service';

type Row = Record<string, any>;

// Banco em memória, só o suficiente para o fluxo de coleta.
function makeDb(seed: { research: Row; links?: Row[]; questions?: Row[] }) {
  const tables: Record<string, Row[]> = {
    User: [
      { id: 1, name: 'Paula', username: 'paula', profile: 'RESEARCHER', companyId: 10 },
      { id: 2, name: 'Admin', username: 'admin', profile: 'ADMINISTRATOR', companyId: 10 },
    ],
    Research: [seed.research],
    ResearchResearcher: seed.links ?? [{ id: 1, researchId: 5, userId: 1 }],
    Section: [{ id: 50, researchId: 5 }],
    Question: seed.questions ?? [{ id: 100, sectionId: 50 }],
    Collection: [],
    Answer: [],
  };
  let nextId = 1;
  const model = (name: string) => ({
    where: (filter: Row) => {
      const match = () => tables[name].filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
      return {
        first: async () => match()[0] ?? null,
        all: async () => match(),
        delete: async () => {
          tables[name] = tables[name].filter((r) => !match().includes(r));
        },
      };
    },
    create: async (data: Row) => {
      const row = { id: nextId++, receivedAt: '2026-10-10T15:00:00.000Z', ...data };
      tables[name].push(row);
      return row;
    },
  });
  const orm = { public: new Proxy({}, { get: (_t, name: string) => model(name) }) };
  return { tables, prisma: { client: { orm } } as any };
}

const baseResearch = { id: 5, companyId: 10, status: 'IN_FIELD', recordInterview: true };
const researcher = { sub: 'paula', username: 'paula', profile: 'RESEARCHER', companyId: 10 } as any;
const admin = { sub: 'admin', username: 'admin', profile: 'ADMINISTRATOR', companyId: 10 } as any;

const consent = { accepted: true, acceptedAt: '2026-10-10T13:59:00.000Z' };
const payload = (extra: Row = {}) => ({
  researchId: 5,
  startedAt: '2026-10-10T14:00:00.000Z',
  finishedAt: '2026-10-10T14:10:00.000Z',
  answers: [{ questionId: 100, value: 'sim' }],
  audioDurationSeconds: 600,
  consent,
  ...extra,
});
const audio = { originalname: 'a.m4a', mimetype: 'audio/mp4', size: 4, buffer: Buffer.from([1, 2, 3, 4]) };

function setup(research: Row = baseResearch) {
  const db = makeDb({ research });
  const storage = {
    save: jest.fn(async () => '5/abc.m4a'),
    open: jest.fn(async () => ({ stream: {} as any, size: 4 })),
    remove: jest.fn(async () => undefined),
  };
  const service = new CollectionService(db.prisma, storage as unknown as AudioStorage);
  return { db, storage, service };
}

describe('CollectionService.create', () => {
  it('grava a coleta com o consentimento (data, hora e quem confirmou) e o áudio', async () => {
    const { db, storage, service } = setup();
    const result = await service.create(payload() as any, audio, researcher);

    expect(storage.save).toHaveBeenCalledTimes(1);
    const saved = db.tables.Collection[0];
    expect(saved.consentGiven).toBe(true);
    expect(saved.consentAt).toBe('2026-10-10T13:59:00.000Z');
    expect(saved.consentConfirmedById).toBe(1);
    expect(saved.audioPath).toBe('5/abc.m4a');
    expect(db.tables.Answer).toHaveLength(1);
    expect(result.hasAudio).toBe(true);
    expect(result.audioDurationSeconds).toBe(600);
    expect(result.consent.confirmedByName).toBe('Paula');
  });

  it('recusa coleta de pesquisa com gravação sem consentimento — e não grava nada', async () => {
    const { db, storage, service } = setup();
    await expect(service.create(payload({ consent: undefined }) as any, audio, researcher)).rejects.toMatchObject({
      response: { code: 'CONSENT_REQUIRED' },
    });
    await expect(
      service.create(payload({ consent: { accepted: false, acceptedAt: consent.acceptedAt } }) as any, audio, researcher),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(db.tables.Collection).toHaveLength(0);
    expect(db.tables.Answer).toHaveLength(0);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('recusa sem consentimento mesmo que a coleta venha sem áudio', async () => {
    const { db, service } = setup();
    await expect(service.create(payload({ consent: undefined }) as any, undefined, researcher)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.tables.Collection).toHaveLength(0);
  });

  it('em pesquisa sem gravação, aceita a coleta sem consentimento e não registra aceite', async () => {
    const { db, service } = setup({ ...baseResearch, recordInterview: false });
    await service.create(payload({ consent: undefined }) as any, undefined, researcher);
    expect(db.tables.Collection[0].consentGiven).toBe(false);
    expect(db.tables.Collection[0].consentConfirmedById).toBeNull();
  });

  it('em pesquisa sem gravação, recusa áudio', async () => {
    const { db, storage, service } = setup({ ...baseResearch, recordInterview: false });
    await expect(service.create(payload() as any, audio, researcher)).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.save).not.toHaveBeenCalled();
    expect(db.tables.Collection).toHaveLength(0);
  });

  it('recusa formato que não é áudio', async () => {
    const { service } = setup();
    await expect(service.create(payload() as any, { ...audio, mimetype: 'text/html' }, researcher)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('recusa resposta de questão que não é da pesquisa, sem deixar áudio no disco', async () => {
    const { db, storage, service } = setup();
    await expect(
      service.create(payload({ answers: [{ questionId: 999, value: 'x' }] }) as any, audio, researcher),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.save).not.toHaveBeenCalled();
    expect(db.tables.Collection).toHaveLength(0);
  });

  it('reenvio com o mesmo clientId não duplica a coleta', async () => {
    const { db, storage, service } = setup();
    const first = await service.create(payload({ clientId: 'c-1' }) as any, audio, researcher);
    const second = await service.create(payload({ clientId: 'c-1' }) as any, audio, researcher);
    expect(second.id).toBe(first.id);
    expect(db.tables.Collection).toHaveLength(1);
    expect(storage.save).toHaveBeenCalledTimes(1);
  });

  it('só pesquisador vinculado envia coleta', async () => {
    const { service } = setup();
    await expect(service.create(payload() as any, audio, admin)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('recusa pesquisa em rascunho', async () => {
    const { service } = setup({ ...baseResearch, status: 'DRAFT' });
    await expect(service.create(payload() as any, audio, researcher)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CollectionService — acesso ao áudio e à lista', () => {
  async function withCollection() {
    const ctx = setup();
    await ctx.service.create(payload() as any, audio, researcher);
    return ctx;
  }

  it('administrador da empresa da pesquisa ouve o áudio', async () => {
    const { service } = await withCollection();
    const file = await service.getAudio(1, admin);
    expect(file.mimeType).toBe('audio/mp4');
    expect(file.size).toBe(4);
  });

  it('quem é de outra empresa não ouve, nem lista', async () => {
    const { service } = await withCollection();
    const outsider = { ...admin, companyId: 99 };
    await expect(service.getAudio(1, outsider)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.findAll(5, outsider)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('pesquisador e superadministrador não ouvem o áudio', async () => {
    const { service } = await withCollection();
    await expect(service.getAudio(1, researcher)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getAudio(1, { ...admin, profile: 'SUPERADMINISTRATOR', companyId: null })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('coleta sem gravação responde 404 no áudio', async () => {
    const ctx = setup({ ...baseResearch, recordInterview: false });
    await ctx.service.create(payload({ consent: undefined }) as any, undefined, researcher);
    await expect(ctx.service.getAudio(1, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a lista indica quais coletas têm gravação e a duração de cada uma', async () => {
    const { service } = await withCollection();
    await service.create(payload({ clientId: 'sem-audio', audioDurationSeconds: undefined }) as any, undefined, researcher);

    const list = await service.findAll(5, admin);
    expect(list).toHaveLength(2);
    const withAudio = list.find((c) => c.hasAudio)!;
    const without = list.find((c) => !c.hasAudio)!;
    expect(withAudio.audioDurationSeconds).toBe(600);
    expect(without.audioDurationSeconds).toBeNull();
  });
});
