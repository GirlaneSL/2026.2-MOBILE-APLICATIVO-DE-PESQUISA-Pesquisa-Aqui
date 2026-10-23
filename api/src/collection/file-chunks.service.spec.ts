import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CollectionFileChunkService } from './file-chunks.service';
import { PARTIAL_MAX_AGE_MS, PartialUploadStore, partialKey } from './partial-upload.store';

type Row = Record<string, any>;

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const researcher = { sub: 'paula', username: 'paula', profile: 'RESEARCHER', companyId: 10 } as any;
const admin = { sub: 'admin', username: 'admin', profile: 'ADMINISTRATOR', companyId: 10 } as any;

function makeDb(collections: Row[]) {
  const tables: Record<string, Row[]> = {
    User: [{ id: 1, username: 'paula', profile: 'RESEARCHER', companyId: 10 }],
    Research: [{ id: 5, companyId: 10 }],
    Collection: collections,
  };
  const model = (name: string) => ({
    where: (filter: Row) => ({
      first: async () => tables[name].find((r) => Object.entries(filter).every(([k, v]) => r[k] === v)) ?? null,
    }),
  });
  return { client: { orm: { public: new Proxy({}, { get: (_t, name: string) => model(name) }) } } } as any;
}

describe('CollectionFileChunkService', () => {
  let dir: string;
  let store: PartialUploadStore;
  let uploadFile: jest.Mock;
  let service: CollectionFileChunkService;
  const name = '9b2f1c1e-0000-4000-8000-000000000001.m4a';
  const base = { name, questionId: undefined as number | undefined, mimeType: 'audio/mp4', totalBytes: 10 };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'partial-'));
    process.env.PARTIAL_UPLOAD_DIR = dir;
    store = new PartialUploadStore();
    uploadFile = jest.fn(async () => ({ status: 'ACCEPTED', file: { name: null, mimeType: 'audio/mp4', sizeBytes: 10 } }));
    service = new CollectionFileChunkService(
      makeDb([{ id: 7, researchId: 5, researcherId: 1, clientId: CLIENT_ID }]),
      { uploadFile } as any,
      store,
    );
  });

  afterEach(async () => {
    delete process.env.PARTIAL_UPLOAD_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  const chunk = (bytes: number[]) => ({ buffer: Buffer.from(bytes), size: bytes.length });
  const query = { name, totalBytes: 10, questionId: undefined };

  it('guarda os pedaços e só envia o arquivo inteiro ao armazenamento no último', async () => {
    const first = await service.receive(CLIENT_ID, { ...base, offset: 0 } as any, chunk([1, 2, 3, 4]), researcher);
    expect(first).toEqual({ status: 'PARTIAL', receivedBytes: 4, totalBytes: 10 });
    expect(uploadFile).not.toHaveBeenCalled();

    const second = await service.receive(CLIENT_ID, { ...base, offset: 4 } as any, chunk([5, 6, 7, 8, 9, 10]), researcher);
    expect(second).toMatchObject({ status: 'ACCEPTED' });
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(uploadFile.mock.calls[0][2].buffer).toEqual(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    // concluído: nada sobra no servidor
    expect(await service.progress(CLIENT_ID, query as any, researcher)).toEqual({ receivedBytes: 0, totalBytes: 10 });
  });

  it('retoma de onde parou: o progresso diz quanto já chegou', async () => {
    await service.receive(CLIENT_ID, { ...base, offset: 0 } as any, chunk([1, 2, 3, 4]), researcher);
    expect(await service.progress(CLIENT_ID, query as any, researcher)).toEqual({ receivedBytes: 4, totalBytes: 10 });
  });

  it('pedaço repetido (resposta perdida) não corrompe o arquivo', async () => {
    await service.receive(CLIENT_ID, { ...base, offset: 0 } as any, chunk([1, 2, 3, 4]), researcher);
    const repeated = await service.receive(CLIENT_ID, { ...base, offset: 0 } as any, chunk([1, 2, 3, 4]), researcher);
    expect(repeated).toEqual({ status: 'PARTIAL', receivedBytes: 4, totalBytes: 10 });
    await service.receive(CLIENT_ID, { ...base, offset: 4 } as any, chunk([5, 6, 7, 8, 9, 10]), researcher);
    expect(uploadFile.mock.calls[0][2].buffer).toEqual(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  });

  it('pedaço adiantado não é gravado: o servidor diz onde está', async () => {
    const early = await service.receive(CLIENT_ID, { ...base, offset: 5 } as any, chunk([6, 7, 8, 9, 10]), researcher);
    expect(early).toEqual({ status: 'PARTIAL', receivedBytes: 0, totalBytes: 10 });
  });

  it('pedaço que passa do total é recusado', async () => {
    await expect(
      service.receive(CLIENT_ID, { ...base, offset: 8 } as any, chunk([1, 2, 3, 4]), researcher),
    ).rejects.toMatchObject({ response: { code: 'CHUNK_OUT_OF_RANGE', retryable: false } });
  });

  it('recusa definitiva do arquivo inteiro descarta o que foi recebido', async () => {
    uploadFile.mockRejectedValueOnce(new BadRequestException({ code: 'INVALID_CONTENT' }));
    await service.receive(CLIENT_ID, { ...base, offset: 0 } as any, chunk([1, 2, 3, 4]), researcher);
    await expect(
      service.receive(CLIENT_ID, { ...base, offset: 4 } as any, chunk([5, 6, 7, 8, 9, 10]), researcher),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect((await service.progress(CLIENT_ID, query as any, researcher)).receivedBytes).toBe(0);
  });

  it('falha do servidor ao gravar mantém o que chegou, para a próxima tentativa não recomeçar', async () => {
    uploadFile.mockRejectedValueOnce(new Error('disco cheio'));
    await service.receive(CLIENT_ID, { ...base, offset: 0 } as any, chunk([1, 2, 3, 4]), researcher);
    await expect(
      service.receive(CLIENT_ID, { ...base, offset: 4 } as any, chunk([5, 6, 7, 8, 9, 10]), researcher),
    ).rejects.toThrow('disco cheio');
    expect((await service.progress(CLIENT_ID, query as any, researcher)).receivedBytes).toBe(10);
  });

  it('coleta que ainda não chegou: COLLECTION_NOT_RECEIVED, para o app mandar as respostas primeiro', async () => {
    await expect(
      service.receive('22222222-2222-4222-8222-222222222222', { ...base, offset: 0 } as any, chunk([1]), researcher),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.receive('22222222-2222-4222-8222-222222222222', { ...base, offset: 0 } as any, chunk([1]), researcher),
    ).rejects.toMatchObject({ response: { code: 'COLLECTION_NOT_RECEIVED', retryable: true } });
  });

  it('só pesquisador envia pedaços', async () => {
    await expect(service.receive(CLIENT_ID, { ...base, offset: 0 } as any, chunk([1]), admin)).rejects.toMatchObject({ status: 403 });
    await expect(service.progress(CLIENT_ID, query as any, admin)).rejects.toMatchObject({ status: 403 });
  });

  it('pedaços abandonados há dias são apagados quando um arquivo novo começa', async () => {
    const oldKey = partialKey(7, null, 99, 'velho.m4a');
    await store.append(oldKey, 0, Buffer.from([1, 2, 3]));
    const old = new Date(Date.now() - PARTIAL_MAX_AGE_MS - 60_000);
    await utimes(join(dir, `${oldKey}.part`), old, old);

    await service.receive(CLIENT_ID, { ...base, offset: 0 } as any, chunk([1, 2, 3, 4]), researcher);
    expect(await store.size(oldKey)).toBe(0);
  });

  it('chave de pedaço inválida nunca vira caminho de arquivo', async () => {
    await writeFile(join(dir, 'x.part'), 'x');
    await expect(store.size('../../etc/passwd')).resolves.toBe(0);
    await expect(store.append('../x', 0, Buffer.from([1]))).rejects.toThrow('Invalid partial upload key');
  });
});
