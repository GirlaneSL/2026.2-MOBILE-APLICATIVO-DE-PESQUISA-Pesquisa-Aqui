import { BadRequestException } from '@nestjs/common';
import { ResearchService } from './research.service';

// Mudar a gravação da entrevista é mudança de estrutura: só vale enquanto a pesquisa é rascunho.
function setup(status: string, recordInterview: boolean) {
  const research = { id: 1, companyId: 10, status, recordInterview };
  const update = jest.fn(async (data: any) => ({ ...research, ...data }));
  const prisma = {
    client: {
      orm: {
        public: {
          Research: { where: () => ({ first: async () => research, update }) },
          Section: { where: () => ({ all: async () => [{ id: 7 }] }) },
          Question: { where: () => ({ first: async () => ({ id: 1 }) }) },
        },
      },
    },
  } as any;
  const user = { sub: 'adm', username: 'adm', profile: 'ADMINISTRATOR', companyId: 10 } as any;
  return { service: new ResearchService(prisma, { removeDir: jest.fn() } as any), update, user };
}

describe('ResearchService.update — recordInterview', () => {
  it('liga e desliga livremente no rascunho', async () => {
    const { service, update, user } = setup('DRAFT', false);
    await service.update(1, { recordInterview: true }, user);
    expect(update).toHaveBeenCalledWith({ recordInterview: true });
  });

  it.each(['PUBLISHED', 'IN_FIELD'])('impede ligar com a pesquisa %s', async (status) => {
    const { service, update, user } = setup(status, false);
    await expect(service.update(1, { recordInterview: true }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it.each(['PUBLISHED', 'IN_FIELD'])('impede desligar com a pesquisa %s', async (status) => {
    const { service, update, user } = setup(status, true);
    await expect(service.update(1, { recordInterview: false }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('reenviar o mesmo valor não é mudança', async () => {
    const { service, update, user } = setup('IN_FIELD', true);
    await service.update(1, { recordInterview: true, targetAudience: 'Adultos' }, user);
    expect(update).toHaveBeenCalled();
  });

  it('continua permitindo editar outros campos em campo', async () => {
    const { service, update, user } = setup('IN_FIELD', true);
    await service.update(1, { description: 'nova' }, user);
    expect(update).toHaveBeenCalledWith({ description: 'nova' });
  });
});
