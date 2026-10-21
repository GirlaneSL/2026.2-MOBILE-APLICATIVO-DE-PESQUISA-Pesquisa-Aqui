import type { Research } from "@/lib/research";
import {
    CellTitle,
    DataTable,
    DataTableHeader,
    DataTableToolbar,
    Muted,
    RowActions,
    RowLink,
    TableChip,
    TableEmpty,
    TableSearch,
    TableViewControls,
    sortRows,
    type DataColumn,
    type TableSort,
    type TableView,
} from "@/components/ui/data-table";
import {
    avatarTone,
    daysUntilEnd,
    formatPeriod,
    initialsOf,
    periodProgress,
    type FieldCollection,
} from "@/lib/fieldData";
import type { UserItem } from "@/lib/user";
import { useMemo, useState } from "react";

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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

type Situation = { label: string; tone: "light" | "clay" | "gray"; endingSoon: boolean };

/** Cor do selo na tabela padrão para cada tom de situação. */
const CHIP_TONE = { light: "live", clay: "soon", gray: "done" } as const;

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

/** Tabela de pesquisas do painel: período, equipe, situação e andamento de cada pesquisa. */
export default function PesquisasEquipeTabela({ researches, researchers, links, collections, now, loading = false, teamLoading = false }: PesquisasEquipeTabelaProps) {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<TableSort>("recent");
    const [view, setView] = useState<TableView>("table");
    const byId = useMemo(() => new Map(researchers.map((r) => [r.id, r])), [researchers]);

    const collectionsByResearch = useMemo(() => {
        const map = new Map<number, number>();
        for (const c of collections) map.set(c.researchId, (map.get(c.researchId) ?? 0) + 1);
        return map;
    }, [collections]);

    const sorted = useMemo(
        () => sortRows(researches, sort, { name: (r) => r.title, date: (r) => r.createdAt }),
        [researches, sort]
    );

    const term = normalize(search.trim());
    const rows = useMemo(
        () => (term ? sorted.filter((r) => normalize(`${r.title} ${r.objective ?? ""} ${r.targetAudience ?? ""}`).includes(term)) : sorted),
        [sorted, term]
    );

    const columns: DataColumn<Research>[] = [
        {
            id: "title",
            header: "Pesquisa",
            minWidth: "14rem",
            cell: (research) => {
                const done = collectionsByResearch.get(research.id) ?? 0;
                return (
                    <CellTitle
                        title={research.title}
                        href={`/pesquisas/${research.id}`}
                        sub={
                            <>
                                {formatPeriod(research.startDate, research.endDate, new Date(now))}
                                {research.status !== "DRAFT" && !teamLoading && ` · ${done} ${done === 1 ? "coleta" : "coletas"}`}
                            </>
                        }
                    />
                );
            },
        },
        {
            id: "team",
            header: "Equipe",
            cell: (research) => {
                if (teamLoading) return <Muted>–</Muted>;
                const team = (links[research.id] ?? []).map((id) => byId.get(id)).filter((u): u is UserItem => !!u);
                if (team.length === 0) return <span title="Nenhum pesquisador vinculado"><Muted>Sem equipe</Muted></span>;
                return (
                    <div className="pa-stack" title={team.map((u) => u.name).join(", ")}>
                        {team.slice(0, MAX_AVATARS).map((u) => (
                            <div key={u.id} className={`avatar-pa ${avatarTone(u.id)}`}>{initialsOf(u.name)}</div>
                        ))}
                        {team.length > MAX_AVATARS && <div className="avatar-pa more">+{team.length - MAX_AVATARS}</div>}
                    </div>
                );
            },
        },
        {
            id: "status",
            header: "Situação",
            cell: (research) => {
                const situation = situationOf(research, now);
                return <TableChip tone={CHIP_TONE[situation.tone]}>{situation.label}</TableChip>;
            },
        },
        {
            id: "progress",
            header: "Período decorrido",
            cell: (research) => {
                const situation = situationOf(research, now);
                const progress = periodProgress(research, now);
                const filled = Math.round(progress * SEGMENTS);
                const pct = Math.round(progress * 100);
                return (
                    <div className="pa-seg-wrap" role="img" aria-label={`${pct}% do período decorrido`}>
                        <div className="pa-seg" aria-hidden="true">
                            {Array.from({ length: SEGMENTS }).map((_, i) => (
                                <i key={i} className={i < filled ? (situation.endingSoon ? "c" : "f") : ""} />
                            ))}
                        </div>
                        <span className="pct">{pct}%</span>
                    </div>
                );
            },
        },
        {
            id: "actions",
            header: "Ações",
            hideHeader: true,
            align: "right",
            cell: (research) => (
                <RowActions>
                    <RowLink href={`/pesquisas/${research.id}`}>Abrir</RowLink>
                </RowActions>
            ),
        },
    ];

    return (
        <div>
            <DataTableHeader title="Pesquisas cadastradas" count={term ? `${rows.length} de ${researches.length}` : researches.length} />

            {!loading && researches.length > 0 && (
                <DataTableToolbar>
                    <TableSearch value={search} onChange={setSearch} placeholder="Buscar por título ou público..." label="Buscar pesquisas" />
                    <div className="grow flex flex-wrap items-center gap-2">
                        <TableViewControls sort={sort} onSortChange={setSort} view={view} onViewChange={setView} />
                    </div>
                </DataTableToolbar>
            )}

            <DataTable
                label="Pesquisas cadastradas"
                columns={columns}
                rows={rows}
                getRowKey={(research) => research.id}
                loading={loading}
                loadingLabel="Carregando pesquisas..."
                view={view}
                empty={
                    researches.length === 0 ? (
                        <TableEmpty title="Nenhuma pesquisa cadastrada." text='Use "Nova pesquisa" para começar.' />
                    ) : (
                        <TableEmpty title="Nenhuma pesquisa encontrada" text="Tente outro título ou público." onClear={() => setSearch("")} />
                    )
                }
            />
        </div>
    );
}
