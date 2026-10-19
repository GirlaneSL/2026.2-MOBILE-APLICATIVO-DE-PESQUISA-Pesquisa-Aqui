import type { Research } from "@/lib/research";
import {
    avatarTone,
    daysUntilEnd,
    formatPeriod,
    initialsOf,
    periodProgress,
    type FieldCollection,
} from "@/lib/fieldData";
import type { UserItem } from "@/lib/user";
import Link from "next/link";
import { useMemo } from "react";

type PesquisasEquipeTabelaProps = {
    researches: Research[];
    researchers: UserItem[];
    /** researchId -> ids dos pesquisadores vinculados. */
    links: Record<number, number[]>;
    collections: FieldCollection[];
    now: number;
    loading?: boolean;
    /** Equipe e coletas ainda estão chegando. */
    teamLoading?: boolean;
};

const SEGMENTS = 20;
const MAX_AVATARS = 3;
const ORDER: Record<Research["status"], number> = { IN_FIELD: 0, PUBLISHED: 1, DRAFT: 2, CLOSED: 3 };

type Situation = { label: string; tone: "light" | "clay" | "gray"; endingSoon: boolean };

export function situationOf(research: Research, now: number): Situation {
    if (research.status === "DRAFT") return { label: "Rascunho", tone: "gray", endingSoon: false };
    if (research.status === "CLOSED") return { label: "Encerrada", tone: "gray", endingSoon: false };

    const days = daysUntilEnd(research.endDate, now);
    if (days !== null && days < 0) return { label: "Prazo encerrado", tone: "gray", endingSoon: false };
    if (days !== null && days <= 7) {
        const label = days === 0 ? "Encerra hoje" : days === 1 ? "Encerra amanhã" : `Encerra em ${days} dias`;
        return { label, tone: "clay", endingSoon: true };
    }
    return { label: research.status === "IN_FIELD" ? "Em campo" : "Publicada", tone: "light", endingSoon: false };
}

/** Tabela do painel: período, equipe, situação e andamento de cada pesquisa. */
export default function PesquisasEquipeTabela({ researches, researchers, links, collections, now, loading = false, teamLoading = false }: PesquisasEquipeTabelaProps) {
    const byId = useMemo(() => new Map(researchers.map((r) => [r.id, r])), [researchers]);

    const collectionsByResearch = useMemo(() => {
        const map = new Map<number, number>();
        for (const c of collections) map.set(c.researchId, (map.get(c.researchId) ?? 0) + 1);
        return map;
    }, [collections]);

    const rows = useMemo(
        () =>
            [...researches].sort(
                (a, b) =>
                    ORDER[a.status] - ORDER[b.status] ||
                    new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
            ),
        [researches]
    );

    return (
        <div>
            <div className="pa-table-head">
                <h4>Pesquisas cadastradas</h4>
                <span className="pa-chip gray">{rows.length}</span>
            </div>

            {loading ? (
                <p className="pa-empty" aria-busy="true">Carregando pesquisas...</p>
            ) : rows.length === 0 ? (
                <p className="pa-empty">Nenhuma pesquisa cadastrada. Use &quot;Nova pesquisa&quot; para começar.</p>
            ) : (
                <div className="pa-table-wrap">
                    <table className="pa-table">
                        <thead>
                            <tr>
                                <th>Pesquisa</th>
                                <th>Equipe</th>
                                <th>Situação</th>
                                <th>Período decorrido</th>
                                <th><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((research) => {
                                const team = (links[research.id] ?? []).map((id) => byId.get(id)).filter((u): u is UserItem => !!u);
                                const situation = situationOf(research, now);
                                const progress = periodProgress(research, now);
                                const filled = Math.round(progress * SEGMENTS);
                                const pct = Math.round(progress * 100);
                                const done = collectionsByResearch.get(research.id) ?? 0;

                                return (
                                    <tr key={research.id}>
                                        <td>
                                            <Link href={`/pesquisas/${research.id}`} className="pa-pn-title">{research.title}</Link>
                                            <small>
                                                {formatPeriod(research.startDate, research.endDate, new Date(now))}
                                                {research.status !== "DRAFT" && !teamLoading && ` · ${done} ${done === 1 ? "coleta" : "coletas"}`}
                                            </small>
                                        </td>
                                        <td>
                                            {teamLoading ? (
                                                <span className="pa-muted" aria-busy="true">–</span>
                                            ) : team.length === 0 ? (
                                                <span className="pa-muted" title="Nenhum pesquisador vinculado">Sem equipe</span>
                                            ) : (
                                                <div className="pa-stack" title={team.map((u) => u.name).join(", ")}>
                                                    {team.slice(0, MAX_AVATARS).map((u) => (
                                                        <div key={u.id} className={`avatar-pa ${avatarTone(u.id)}`}>{initialsOf(u.name)}</div>
                                                    ))}
                                                    {team.length > MAX_AVATARS && (
                                                        <div className="avatar-pa more">+{team.length - MAX_AVATARS}</div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td><span className={`pa-chip ${situation.tone}`}><i />{situation.label}</span></td>
                                        <td>
                                            <div className="pa-seg-wrap" role="img" aria-label={`${pct}% do período decorrido`}>
                                                <div className="pa-seg" aria-hidden="true">
                                                    {Array.from({ length: SEGMENTS }).map((_, i) => (
                                                        <i key={i} className={i < filled ? (situation.endingSoon ? "c" : "f") : ""} />
                                                    ))}
                                                </div>
                                                <span className="pct">{pct}%</span>
                                            </div>
                                        </td>
                                        <td className="pa-actions">
                                            <Link href={`/pesquisas/${research.id}`} className="pa-open">Abrir</Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
