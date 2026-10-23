import type { SentRecord } from './sentHistory';

// Progresso do pesquisador frente à meta, calculado no aparelho (funciona sem internet).
//
// feitas = o que o servidor tinha na última atualização da lista (`collected`)
//        + o que foi enviado depois dela (histórico do aparelho)
//        + o que está finalizado e ainda aguardando envio.
// Rascunhos não contam: a coleta só vale depois de finalizada.

export interface ProgressSource {
    id: number;
    targetCount?: number | null;
    collected?: number;
    progressSyncedAt?: string;
}

export interface ResearchProgress {
    done: number;
    /** Dessas, quantas ainda não chegaram ao servidor. */
    pending: number;
    /** null = o administrador não definiu meta. */
    target: number | null;
    /** Quantas faltam (nunca negativo); null sem meta. */
    remaining: number | null;
    /** 0 a 100; null sem meta. */
    percent: number | null;
}

export function computeProgress(
    research: ProgressSource,
    sent: SentRecord[],
    pendingFinished: number,
): ResearchProgress {
    const since = research.progressSyncedAt;
    const sentAfterSync = sent.filter(
        (record) => record.researchId === research.id && (!since || record.sentAt > since),
    ).length;

    const done = (research.collected ?? 0) + sentAfterSync + pendingFinished;
    const target = research.targetCount ?? null;

    return {
        done,
        pending: pendingFinished,
        target,
        remaining: target === null ? null : Math.max(0, target - done),
        percent: target === null ? null : Math.min(100, Math.round((done / target) * 100)),
    };
}
