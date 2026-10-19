'use client'

import { Contour } from "@/components/ui/contour";
import { Spinner } from "@/components/ui/spinner";
import { getResearchLinkedResearchers, linkResearcher, unlinkResearcher } from "@/lib/research";
import { getResearchers, type UserItem } from "@/lib/user";
import { Check, Link2Off, Plus, Search, SearchX, UserRoundX, UsersRound, X } from "lucide-react";
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

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PesquisadoresVinculados({ researchId, companyId }: { researchId: number; companyId: number }) {
    const [researchers, setResearchers] = useState<UserItem[]>([]);
    const [linked, setLinked] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('ALL');

    const load = useCallback(async () => {
        try {
            const [users, links] = await Promise.all([getResearchers(), getResearchLinkedResearchers(researchId)]);
            setResearchers(users.filter((u) => u.companyId === companyId));
            setLinked(new Set(links.map((l) => l.userId)));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao carregar pesquisadores');
        } finally {
            setLoading(false);
        }
    }, [researchId, companyId]);

    useEffect(() => { load(); }, [load]);

    const toggle = async (user: UserItem) => {
        setBusyId(user.id);
        try {
            if (linked.has(user.id)) {
                await unlinkResearcher(researchId, user.id);
                toast.success('Pesquisador desvinculado');
            } else {
                await linkResearcher(researchId, user.id);
                toast.success('Pesquisador vinculado');
            }
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao atualizar vínculo');
        } finally {
            setBusyId(null);
        }
    };

    const linkedCount = researchers.filter((r) => linked.has(r.id)).length;
    const total = researchers.length;
    const pct = total ? Math.round((linkedCount / total) * 100) : 0;

    // Vinculados primeiro; dentro de cada grupo, ordem alfabética.
    const visible = useMemo(() => {
        const term = normalize(search.trim());
        return researchers
            .filter((r) => {
                const isLinked = linked.has(r.id);
                if (filter === 'LINKED' && !isLinked) return false;
                if (filter === 'AVAILABLE' && isLinked) return false;
                return !term || normalize(r.name).includes(term) || normalize(r.username).includes(term);
            })
            .sort((a, b) => {
                const la = linked.has(a.id) ? 0 : 1;
                const lb = linked.has(b.id) ? 0 : 1;
                return la - lb || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
            });
    }, [researchers, linked, search, filter]);

    if (loading) {
        return (
            <div className="flex flex-col gap-4" aria-busy="true">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Carregando pesquisadores...</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex animate-pulse items-center gap-3 rounded-[22px] border border-border bg-white p-4">
                            <div className="size-12 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3.5 w-2/3 rounded-full bg-muted" />
                                <div className="h-3 w-1/3 rounded-full bg-muted" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
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

            {/* Ferramentas */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {filters.map((f) => {
                        const on = f.value === filter;
                        return (
                            <button
                                key={f.value}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setFilter(f.value)}
                                className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors ${
                                    on
                                        ? 'border-ink bg-ink text-white'
                                        : 'border-border bg-white text-muted-foreground hover:border-[#c6d0c9] hover:text-ink'
                                }`}
                            >
                                {f.label}
                                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${on ? 'bg-white/15 text-[var(--mint)]' : 'bg-[#ebeeeb]'}`}>
                                    {f.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="relative w-full lg:max-w-xs">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Buscar pesquisadores"
                        placeholder="Buscar por nome ou usuário..."
                        className="h-10 w-full rounded-full border border-input bg-white pl-10 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                    />
                    {search && (
                        <button
                            type="button"
                            aria-label="Limpar busca"
                            onClick={() => setSearch('')}
                            className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground hover:text-ink"
                        >
                            <X className="size-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Lista */}
            {visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-[22px] border border-dashed border-input bg-muted/40 px-6 py-10 text-center">
                    <div className="grid size-12 place-items-center rounded-2xl bg-white text-[var(--green-deep)] ring-1 ring-border">
                        <SearchX className="size-5" />
                    </div>
                    <p className="text-sm font-semibold">Nenhum pesquisador encontrado</p>
                    <button
                        type="button"
                        onClick={() => { setSearch(''); setFilter('ALL'); }}
                        className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3.5 text-[13px] font-medium hover:bg-muted"
                    >
                        <X className="size-3.5" /> Limpar filtros
                    </button>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map((user) => {
                        const isLinked = linked.has(user.id);
                        const busy = busyId === user.id;

                        return (
                            <li
                                key={user.id}
                                className={`group relative flex flex-col gap-4 overflow-hidden rounded-[22px] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_34px_-26px_rgba(10,20,16,0.45)] ${
                                    isLinked
                                        ? 'border-[#b9d6c6] bg-[#eef6f1]'
                                        : 'border-border bg-white hover:border-[#c6d0c9]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        <div className={`avatar-pa size-12 text-[15px] ${toneOf(user.id)}`} aria-hidden="true">
                                            {initialsOf(user.name)}
                                        </div>
                                        {isLinked && (
                                            <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-[#eef6f1] bg-[var(--green-deep)] text-white">
                                                <Check className="size-3" />
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[15px] font-semibold tracking-tight" title={user.name}>{user.name}</p>
                                        <p className="truncate font-mono text-[12.5px] text-muted-foreground" title={user.username}>@{user.username}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ${
                                            isLinked ? 'bg-white text-[var(--green-deep)]' : 'bg-[#ebeeeb] text-muted-foreground'
                                        }`}
                                    >
                                        <span className={`size-1.5 rounded-full ${isLinked ? 'bg-[var(--green)]' : 'bg-[#9aa59e]'}`} />
                                        {isLinked ? 'Na equipe' : 'Disponível'}
                                    </span>

                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => toggle(user)}
                                        className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                            isLinked
                                                ? 'border border-border bg-white text-foreground hover:border-[#e8c4b8] hover:bg-[#f3e0d9] hover:text-[#8a432f]'
                                                : 'bg-ink text-white hover:bg-[#26332c]'
                                        }`}
                                    >
                                        {busy ? <Spinner className="size-3.5" /> : isLinked ? <Link2Off className="size-3.5" /> : <Plus className="size-3.5" />}
                                        {busy ? 'Aguarde...' : isLinked ? 'Desvincular' : 'Vincular'}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
