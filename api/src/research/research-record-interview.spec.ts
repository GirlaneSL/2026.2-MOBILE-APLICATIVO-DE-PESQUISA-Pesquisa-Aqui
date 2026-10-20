import { ForbiddenException } from '@nestjs/common';
import { ResearchService } from './research.service';

// Pesquisa publicada (status != DRAFT) ou já baixada por um pesquisador fica travada:
// nenhum campo de conteúdo pode mudar. Só o status (ciclo de vida) continua aceito.
function setup(status: string, recordInterview: boolean, downloads: any[] = []) {
  const research = { id: 1, companyId: 10, status, recordInterview };
  const update = jest.fn(async (data: any) => ({ ...research, ...data }));
  const prisma = {
    client: {
      orm: {
        public: {
          Research: { where: () => ({ first: async () => research, update }) },
          Section: { where: () => ({ all: async () => [{ id: 7 }] }) },
          Question: { where: () => ({ first: async () => ({ id: 1 }) }) },
          ResearchDownload: { where: () => ({ first: async () => downloads[0] ?? null }) },
        },
      },
    },
  } as any;
  const user = { sub: 'adm', username: 'adm', profile: 'ADMINISTRATOR', companyId: 10 } as any;
  return { service: new ResearchService(prisma, { removeDir: jest.fn() } as any), update, user };
}

describe('ResearchService.update — travamento da edição', () => {
  it('edita livremente no rascunho (inclusive a gravação da entrevista)', async () => {
    const { service, update, user } = setup('DRAFT', false);
    await service.update(1, { recordInterview: true, description: 'nova' }, user);
    expect(update).toHaveBeenCalledWith({ recordInterview: true, description: 'nova' });
  });

  it.each(['PUBLISHED', 'IN_FIELD'])('impede editar qualquer campo com a pesquisa %s', async (status) => {
    const { service, update, user } = setup(status, false);
    await expect(service.update(1, { description: 'nova' }, user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update(1, { recordInterview: true }, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('impede editar um rascunho que já tem cópia baixada', async () => {
    const { service, update, user } = setup('DRAFT', false, [{ id: 3 }]);
    await expect(service.update(1, { title: 'x' }, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('continua permitindo avançar o status de uma pesquisa publicada', async () => {
    const { service, update, user } = setup('PUBLISHED', false);
    await service.update(1, { status: 'IN_FIELD' as any }, user);
    expect(update).toHaveBeenCalledWith({ status: 'IN_FIELD' });
  });
});

describe('ResearchService.assertEditable', () => {
  it('libera rascunho sem downloads', async () => {
    const { service, user } = setup('DRAFT', false);
    await expect(service.assertEditable(1, user)).resolves.toMatchObject({ id: 1 });
  });

  it.each(['PUBLISHED', 'IN_FIELD', 'CLOSED'])('bloqueia pesquisa %s', async (status) => {
    const { service, user } = setup(status, false);
    await expect(service.assertEditable(1, user)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia quando já houve download', async () => {
    const { service, user } = setup('DRAFT', false, [{ id: 1 }]);
    await expect(service.assertEditable(1, user)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
