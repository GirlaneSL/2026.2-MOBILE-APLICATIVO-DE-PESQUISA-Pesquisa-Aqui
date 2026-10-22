import { listCollections } from './collectionStore';
import { getCachedResearches, returnResearchCopy } from './researchCache';

export class PendingCollectionsError extends Error {
    constructor() {
        super('Esta pesquisa ainda tem coletas ou rascunhos neste aparelho. Conclua e envie tudo antes de devolvê-la.');
    }
}

/** Devolve a cópia só se não há coleta (rascunho ou ainda não enviada) dessa pesquisa no aparelho. */
export async function returnResearchSafely(id: number): Promise<void> {
    if ((await listCollections(id)).length > 0) throw new PendingCollectionsError();
    await returnResearchCopy(id);
}

/**
 * Devolve, sem barulho, todas as pesquisas baixadas que não têm coleta pendente (usado ao sair da conta).
 * Quem não puder (sem internet, coleta pendente) continua como cópia ativa até ser devolvida ou revogada.
 */
export async function returnAllCopies(timeoutMs = 8000): Promise<void> {
    const run = async () => {
        const downloaded = (await getCachedResearches()).filter((r) => r.isDownloaded);
        for (const research of downloaded) {
            try {
                await returnResearchSafely(research.id);
            } catch (error) {
                console.log(`Cópia da pesquisa ${research.id} não devolvida:`, error);
            }
        }
    };
    await Promise.race([run(), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}
