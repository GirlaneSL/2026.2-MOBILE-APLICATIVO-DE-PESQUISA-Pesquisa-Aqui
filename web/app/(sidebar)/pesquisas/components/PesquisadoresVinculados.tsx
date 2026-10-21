'use client'

import { Button } from "@/components/ui/button";
import { Contour } from "@/components/ui/contour";
import {
    DataTable,
    DataTableHeader,
    DataTableToolbar,
    PersonCell,
    RowActions,
    TableChip,
    TableEmpty,
    TableFilters,
    TableSearch,
    TableViewControls,
    sortRows,
    type DataColumn,
    type TableSort,
    type TableView,
} from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { LoadingState } from "@/components/ui/loadingState";
import { Input } from "@/components/ui/input";
import { getResearchLinkedResearchers, linkResearcher, unlinkResearcher, updateResearcherTarget, type ResearchResearcherLink } from "@/lib/research";
import { getResearchers, type UserItem } from "@/lib/user";
import { Link2Off, Plus, Save, UserRoundX, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Filter = 'ALL' | 'LINKED' | 'AVAILABLE';

const TONES = [
    'bg-[#cfe3d8] text-[#1f3a2f]',
    'bg-[#f0d5cb] text-[#7a3b29]',
    'bg-[#dfe6ef] text-[#2a3d57]',
    'bg-[#e6e0cc] text-[#5b4d1c]',
];

const toneOf = (id: number) => TONES[Math.abs(id) % TONES.length];

const initialsOf = (name?: string) =>
    (name ?? '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || '?';

const MAX_TARGET = 1_000_000;

// Meta válida: número inteiro entre 1 e 1.000.000.
const parseTarget = (raw: string): number | null => {
    const value = Number(raw.trim());
    return raw.trim() !== '' && Number.isInteger(value) && value >= 1 && value <= MAX_TARGET ? value : null;
};

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PesquisadoresVinculados({ researchId, companyId }: { researchId: number; companyId: number }) {
    const [researchers, setResearchers] = useState<UserItem[]>([]);
    const [linked, setLinked] = useState<Set<number>>(new Set());
    const [links, setLinks] = useState<Map<number, ResearchResearcherLink>>(new Map());
    // Meta digitada por pesquisador (ainda não salva)
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('ALL');
    const [sort, setSort] = useState<TableSort>('recent');
    const [view, setView] = useState<TableView>('table');

    const load = useCallback(async () => {
        try {
            const [users, linkList] = await Promise.all([getResearchers(), getResearchLinkedResearchers(researchId)]);
            setResearchers(users.filter((u) => u.companyId === companyId));
            setLinked(new Set(linkList.map((l) => l.userId)));
            setLinks(new Map(linkList.map((l) => [l.userId, l])));
            setDrafts({});
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao carregar pesquisadores');
        } finally {
            setLoading(false);
        }
    }, [researchId, companyId]);

    useEffect(() => { load(); }, [load]);

    const draftOf = (user: UserItem) => {
        if (drafts[user.id] !== undefined) return drafts[user.id];
        const current = links.get(user.id)?.targetCount;
        return current == null ? '' : String(current);
    };

    const toggle = async (user: UserItem) => {
        const isLinked = linked.has(user.id);
        let target: number | undefined;

        if (!isLinked) {
            const parsed = parseTarget(draftOf(user));
            if (parsed === null) {
                toast.error('Informe a meta de coletas (número inteiro a partir de 1) antes de vincular.');
                return;
            }
            target = parsed;
        }

        setBusyId(user.id);
        try {
            if (isLinked) {
                await unlinkResearcher(researchId, user.id);
                toast.success('Pesquisador desvinculado. As coletas já recebidas continuam na pesquisa.');
            } else {
                await linkResearcher(researchId, user.id, target);
                toast.success('Pesquisador vinculado');
            }
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao atualizar vínculo');
        } finally {
            setBusyId(null);
        }
    };

    const saveTarget = async (user: UserItem) => {
        const parsed = parseTarget(draftOf(user));
        if (parsed === null) {
            toast.error('A meta deve ser um número inteiro a partir de 1.');
            return;
        }
        setBusyId(user.id);
        try {
            await updateResearcherTarget(researchId, user.id, parsed);
            toast.success('Meta atualizada');
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao alterar a meta');
        } finally {
            setBusyId(null);
        }
    };

    const linkedCount = researchers.filter((r) => linked.has(r.id)).length;
    const total = researchers.length;
    const pct = total ? Math.round((linkedCount / total) * 100) : 0;

    // Vinculados primeiro; dentro de cada grupo, a ordem escolhida (Recentes ou A-Z).
    const visible = useMemo(() => {
        const term = normalize(search.trim());
        const sorted = sortRows(
            researchers.filter((r) => {
                const isLinked = linked.has(r.id);
                if (filter === 'LINKED' && !isLinked) return false;
                if (filter === 'AVAILABLE' && isLinked) return false;
                return !term || normalize(r.name).includes(term) || normalize(r.username).includes(term);
            }),
            sort,
            { name: (r) => r.name, date: (r) => r.createdAt }
        );
        // Array.sort é estável: dentro de cada grupo a ordem acima é mantida.
        return sorted.sort((a, b) => (linked.has(a.id) ? 0 : 1) - (linked.has(b.id) ? 0 : 1));
    }, [researchers, linked, search, filter, sort]);

    if (loading) {
        return <LoadingState label="Carregando pesquisadores..." shape="people" />;
    }

    if (total === 0) {
        return (
            <div className="relative overflow-hidden rounded-[26px] border border-dashed border-input bg-muted/40 px-6 py-14 text-center">
                <Contour seed={8} rings={10} cx={0.5} cy={0.5} size={1.2} style={{ opacity: 0.3 }} />
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="grid size-14 place-items-center rounded-2xl bg-white text-[var(--green-deep)] ring-1 ring-border">
                        <UserRoundX className="size-6" />
                    </div>
                    <p className="text-base font-semibold tracking-tight">Nenhum pesquisador nesta empresa</p>
                    <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                        Cadastre pesquisadores na página Pesquisadores para poder vinculá-los a esta pesquisa.
                    </p>
                </div>
            </div>
        );
    }

    const filters: { value: Filter; label: string; count: number }[] = [
        { value: 'ALL', label: 'Todos', count: total },
        { value: 'LINKED', label: 'Vinculados', count: linkedCount },
        { value: 'AVAILABLE', label: 'Disponíveis', count: total - linkedCount },
    ];

    const linkedUsers = researchers.filter((r) => linked.has(r.id));

    const columns: DataColumn<UserItem>[] = [
        {
            id: 'name',
            header: 'Pesquisador',
            minWidth: '14rem',
            cell: (user) => <PersonCell id={user.id} name={user.name} username={user.username} />,
        },
        {
            id: 'status',
            header: 'Situação',
            cell: (user) =>
                linked.has(user.id) ? <TableChip tone="live">Na equipe</TableChip> : <TableChip tone="done">Disponível</TableChip>,
        },
        {
            id: 'target',
            header: 'Meta de coletas',
            minWidth: '11rem',
            cell: (user) => {
                const isLinked = linked.has(user.id);
                const busy = busyId === user.id;
                const saved = links.get(user.id)?.targetCount;
                const draft = draftOf(user);
                const changed = isLinked && draft !== (saved == null ? '' : String(saved));
                return (
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_TARGET}
                            step={1}
                            value={draft}
                            placeholder="Ex.: 50"
                            aria-label={`Meta de coletas de ${user.name}`}
                            className="h-9 w-24"
                            disabled={busy}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter' && changed) saveTarget(user); }}
                        />
                        {changed && (
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => saveTarget(user)}>
                                <Save />Salvar
                            </Button>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'delivered',
            header: 'Entregue',
            minWidth: '11rem',
            cell: (user) => {
                const link = links.get(user.id);
                if (!link) return <span className="text-sm text-muted-foreground">-</span>;
                const collected = link.collected ?? 0;
                const target = link.targetCount ?? null;
                const pct = target ? Math.min(100, Math.round((collected / target) * 100)) : 0;
                return (
                    <div className="flex min-w-[9rem] flex-col gap-1">
                        <span className="text-sm font-medium">
                            {collected}{target ? ` de ${target}` : ''} {collected === 1 ? 'coleta' : 'coletas'}
                            {target ? <span className="ml-1 text-xs text-muted-foreground">({pct}%)</span> : null}
                        </span>
                        {target ? (
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                                <div className="h-full rounded-full bg-[var(--green-deep)] transition-all duration-700" style={{ width: `${pct}%` }} />
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground">Sem meta definida</span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: 'Ações',
            hideHeader: true,
            align: 'right',
            cell: (user) => {
                const isLinked = linked.has(user.id);
                const busy = busyId === user.id;
                return (
                    <RowActions>
                        <Button variant={isLinked ? 'outline' : 'default'} size="sm" disabled={busy} onClick={() => toggle(user)}>
                            {busy ? <Spinner className="size-3.5" /> : isLinked ? <Link2Off /> : <Plus />}
                            {busy ? 'Aguarde...' : isLinked ? 'Desvincular' : 'Vincular'}
                        </Button>
                    </RowActions>
                );
            },
        },
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* Resumo da equipe */}
            <article className="pa-card mint introduction-card">
                <Contour seed={5} rings={10} cx={0.92} cy={0.3} size={1} style={{ opacity: 0.5 }} />
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="pa-ic"><UsersRound /></div>
                        <div>
                            <h3 className="!text-lg">Equipe desta pesquisa</h3>
                            <p className="desc">
                                {linkedCount === 0
                                    ? 'Ninguém vinculado ainda. Só pesquisadores vinculados recebem esta pesquisa no aplicativo.'
                                    : `${linkedCount} de ${total} ${total === 1 ? 'pesquisador' : 'pesquisadores'} da empresa participam.`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        {linkedUsers.length > 0 && (
                            <div className="flex -space-x-2.5" aria-hidden="true">
                                {linkedUsers.slice(0, 5).map((u) => (
                                    <span
                                        key={u.id}
                                        title={u.name}
                                        className={`grid size-10 place-items-center rounded-full border-[3px] border-[#d6e8de] text-[12px] font-bold ${toneOf(u.id)}`}
                                    >
                                        {initialsOf(u.name)}
                                    </span>
                                ))}
                                {linkedUsers.length > 5 && (
                                    <span className="grid size-10 place-items-center rounded-full border-[3px] border-[#d6e8de] bg-[var(--forest)] text-[12px] font-bold text-[var(--mint)]">
                                        +{linkedUsers.length - 5}
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="text-right">
                            <p className="pa-stat !text-[44px]">
                                {linkedCount}<span className="text-[22px] text-[var(--green-deep)]">/{total}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5">
                    <div className="h-2 overflow-hidden rounded-full bg-white/60">
                        <div
                            className="h-full rounded-full bg-[var(--green-deep)] transition-all duration-700"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs font-medium text-[var(--green-deep)]">{pct}% da equipe de campo vinculada</p>
                </div>
            </article>

            {/* Tabela de pesquisadores da empresa */}
            <div>
                <DataTableHeader
                    title="Pesquisadores da empresa"
                    count={visible.length === total ? total : `${visible.length} de ${total}`}
                />

                <DataTableToolbar>
                    <TableSearch
                        value={search}
                        onChange={setSearch}
                        placeholder="Buscar por nome ou usuário..."
                        label="Buscar pesquisadores"
                    />
                    <div className="grow flex flex-wrap items-center gap-2">
                        <TableFilters<Filter> label="Situação" value={filter} onChange={setFilter} options={filters} />
                        <TableViewControls sort={sort} onSortChange={setSort} view={view} onViewChange={setView} />
                    </div>
                </DataTableToolbar>

                <DataTable
                    label="Pesquisadores da empresa"
                    columns={columns}
                    rows={visible}
                    getRowKey={(user) => user.id}
                    rowTone={(user) => (linked.has(user.id) ? 'on' : undefined)}
                    minWidth="860px"
                    view={view}
                    empty={
                        <TableEmpty
                            title="Nenhum pesquisador encontrado"
                            text="Tente outro nome ou usuário."
                            onClear={() => { setSearch(''); setFilter('ALL'); }}
                        />
                    }
                />
            </div>
        </div>
    );
}
