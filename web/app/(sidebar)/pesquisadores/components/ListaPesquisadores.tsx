'use client'

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Contour } from "@/components/ui/contour";
import { LoadingState } from "@/components/ui/loadingState";
import { Input } from "@/components/ui/input";
import { avatarTone, initialsOf } from "@/lib/fieldData";
import { deleteUser, UserItem } from "@/lib/user";
import { ArrowDownAZ, Building2, CalendarClock, LayoutGrid, List, Search, SearchX, Sparkles, Trash2, UsersRound, X } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Tabela from "../../(home)/components/tabela";

interface Row {
    name: ReactNode;
    username: string;
    company: ReactNode;
    createdAt: string;
    delete?: ReactNode;
}

type Column = { key: keyof Row; label: string };
type ViewMode = 'cards' | 'table';
type SortMode = 'recent' | 'name';

interface ListaPesquisadoresProps {
    researchers: UserItem[];
    companyNames: Record<number, string>;
    loading: boolean;
    canDelete: boolean;
    showCompany: boolean;
    onDeleted: (username: string) => void;
    /** Momento de referência (ms) para "há X dias" e para o selo "Novo". */
    referenceTime?: number;
    /** Limita a altura da listagem (uso em card). */
    maxHeightClassName?: string;
}

const DAY = 24 * 60 * 60 * 1000;

const normalize = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

const timeValue = (iso?: string) => {
    const t = iso ? new Date(iso).getTime() : NaN;
    return Number.isNaN(t) ? 0 : t;
};

/** "hoje", "ontem", "há 5 dias", "há 3 meses"… */
const relativeDays = (iso: string | undefined, now: number) => {
    const t = timeValue(iso);
    if (!t || !now) return '';
    const days = Math.max(0, Math.floor((now - t) / DAY));
    if (days === 0) return 'hoje';
    if (days === 1) return 'ontem';
    if (days < 30) return `há ${days} dias`;
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? 'há 1 mês' : `há ${months} meses`;
    const years = Math.floor(months / 12);
    return years === 1 ? 'há 1 ano' : `há ${years} anos`;
};

/** Cores fixas do avatar por pessoa (mesma paleta do painel da equipe). */
const AVATAR_TONES: Record<string, string> = {
    a1: 'bg-[#cfe3d8] text-[#1f3a2f]',
    a2: 'bg-[#f0d5cb] text-[#7a3b29]',
    a3: 'bg-[#dfe6ef] text-[#2a3d57]',
    a4: 'bg-[#e6e0cc] text-[#5b4d1c]',
};

function Avatar({ user, size = 'md' }: { user: UserItem; size?: 'sm' | 'md' | 'lg' }) {
    const sizes = {
        sm: 'size-9 text-[13px]',
        md: 'size-11 text-sm',
        lg: 'size-14 text-lg',
    };

    return (
        <div
            aria-hidden="true"
            className={`avatar-pa ${sizes[size]} ${AVATAR_TONES[avatarTone(user.id)]}`}
        >
            {initialsOf(user.name)}
        </div>
    );
}

function Segmented<T extends string>({
    value,
    onChange,
    options,
    label,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string; icon: ReactNode }[];
    label: string;
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted p-0.5"
        >
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(o.value)}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-all ${
                            active
                                ? 'bg-ink text-white shadow-sm'
                                : 'text-muted-foreground hover:text-ink'
                        }`}
                    >
                        <span className="[&>svg]:size-3.5">{o.icon}</span>
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

function EmptyState({ hasAny, onClear }: { hasAny: boolean; onClear: () => void }) {
    return (
        <div className="relative overflow-hidden rounded-[22px] border border-dashed border-input bg-muted/40 px-6 py-12 text-center">
            <Contour seed={4} rings={9} cx={0.5} cy={0.5} size={1.1} style={{ opacity: 0.35 }} />
            <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="grid size-14 place-items-center rounded-2xl bg-white text-green-deep shadow-sm ring-1 ring-border">
                    {hasAny ? <SearchX className="size-6" /> : <UsersRound className="size-6" />}
                </div>
                <div>
                    <p className="text-base font-semibold tracking-tight">
                        {hasAny ? 'Nenhum pesquisador encontrado' : 'Sua equipe de campo começa aqui'}
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                        {hasAny
                            ? 'Tente outro nome, usuário ou empresa.'
                            : 'Use "Novo pesquisador" para cadastrar quem vai coletar em campo.'}
                    </p>
                </div>
                {hasAny && (
                    <Button variant="outline" size="sm" onClick={onClear}>
                        <X /> Limpar busca
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function ListaPesquisadores({
    researchers,
    companyNames,
    loading,
    canDelete,
    showCompany,
    onDeleted,
    referenceTime = 0,
    maxHeightClassName = "max-h-96",
}: ListaPesquisadoresProps) {
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);
    const [view, setView] = useState<ViewMode>('cards');
    const [sort, setSort] = useState<SortMode>('recent');

    const filtered = useMemo(() => {
        const term = normalize(search.trim());
        const base = !term
            ? researchers
            : researchers.filter((r) =>
                normalize(r.name).includes(term) ||
                normalize(r.username).includes(term) ||
                normalize(companyNames[r.companyId ?? -1] ?? '').includes(term)
            );

        return [...base].sort((a, b) =>
            sort === 'name'
                ? a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
                : timeValue(b.createdAt) - timeValue(a.createdAt)
        );
    }, [researchers, search, companyNames, sort]);

    const isNew = (r: UserItem) =>
        !!referenceTime && timeValue(r.createdAt) >= referenceTime - 30 * DAY;

    const handleDelete = async (user: UserItem) => {
        const confirmed = window.confirm(
            `Tem certeza que deseja excluir o pesquisador "${user.name}"? Ele perderá o acesso ao sistema.`
        );
        if (!confirmed) return;

        setDeleting(user.username);
        try {
            await deleteUser(user.username);
            toast.success("Pesquisador excluído com sucesso!");
            onDeleted(user.username);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Erro ao excluir pesquisador");
        } finally {
            setDeleting(null);
        }
    };

    const columns: Column[] = [
        { key: 'name', label: 'Nome' },
        { key: 'username', label: 'Usuário' },
        ...(showCompany ? [{ key: 'company', label: 'Empresa' } as Column] : []),
        { key: 'createdAt', label: 'Cadastrado em' },
        ...(canDelete ? [{ key: 'delete', label: 'Excluir' } as Column] : []),
    ];

    const rows: Row[] = filtered.map((r) => ({
        name: (
            <span className="flex items-center gap-3">
                <Avatar user={r} size="sm" />
                <span className="font-medium">{r.name}</span>
                {isNew(r) && <Badge>Novo</Badge>}
            </span>
        ),
        username: `@${r.username}`,
        company: companyNames[r.companyId ?? -1]
            ? <Badge variant="outline">{companyNames[r.companyId ?? -1]}</Badge>
            : '—',
        createdAt: formatDate(r.createdAt),
        ...(canDelete && {
            delete: (
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting === r.username}
                    onClick={() => handleDelete(r)}
                >
                    {deleting === r.username ? 'Excluindo...' : 'Excluir'}
                </Button>
            ),
        }),
    }));

    const hasQuery = search.trim().length > 0;

    return (
        <div className="flex flex-col gap-4">
            {/* Barra de ferramentas */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="h-12 rounded-full bg-muted/50 pl-11 pr-11"
                        placeholder="Buscar por nome, usuário ou empresa..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Buscar pesquisadores"
                    />
                    {hasQuery && (
                        <button
                            type="button"
                            aria-label="Limpar busca"
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-[#e0e5e1] hover:text-ink"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Segmented<SortMode>
                        label="Ordenar"
                        value={sort}
                        onChange={setSort}
                        options={[
                            { value: 'recent', label: 'Recentes', icon: <CalendarClock /> },
                            { value: 'name', label: 'A–Z', icon: <ArrowDownAZ /> },
                        ]}
                    />
                    <Segmented<ViewMode>
                        label="Modo de exibição"
                        value={view}
                        onChange={setView}
                        options={[
                            { value: 'cards', label: 'Cards', icon: <LayoutGrid /> },
                            { value: 'table', label: 'Lista', icon: <List /> },
                        ]}
                    />
                </div>
            </div>

            {!loading && researchers.length > 0 && (
                <p className="px-1 text-[13px] text-muted-foreground" aria-live="polite">
                    {hasQuery
                        ? <>Mostrando <b className="font-semibold text-ink">{filtered.length}</b> de {researchers.length} pesquisadores</>
                        : <><b className="font-semibold text-ink">{researchers.length}</b> {researchers.length === 1 ? 'pesquisador' : 'pesquisadores'} na equipe</>}
                </p>
            )}

            {/* Conteúdo */}
            {loading ? (
                <LoadingState label="Carregando pesquisadores..." shape="people" />
            ) : rows.length === 0 ? (
                <EmptyState hasAny={researchers.length > 0} onClear={() => setSearch('')} />
            ) : view === 'table' ? (
                <div className={`${maxHeightClassName} overflow-auto`}>
                    <Tabela<Row> columns={columns} data={rows} />
                </div>
            ) : (
                <div className={`${maxHeightClassName} overflow-y-auto pr-1`}>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {filtered.map((r) => {
                            const company = companyNames[r.companyId ?? -1];
                            const fresh = isNew(r);
                            const since = relativeDays(r.createdAt, referenceTime);

                            return (
                                <li
                                    key={r.id ?? r.username}
                                    className="group relative flex flex-col gap-4 overflow-hidden rounded-[22px] border border-border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6d0c9] hover:shadow-[0_20px_34px_-26px_rgba(10,20,16,0.45)]"
                                >
                                    {/* curvas de nível discretas que aparecem no hover */}
                                    <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-44 opacity-0 transition-opacity duration-300 group-hover:opacity-60">
                                        <Contour seed={r.id} rings={6} cx={0.5} cy={0.5} size={0.9} width={220} height={180} />
                                    </div>

                                    <div className="relative z-10 flex items-start gap-3">
                                        <Avatar user={r} size="lg" />
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-[15px] font-semibold tracking-tight" title={r.name}>
                                                    {r.name}
                                                </p>
                                                {fresh && (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e4ece7] px-2 py-0.5 text-[11px] font-semibold text-green-deep">
                                                        <Sparkles className="size-3" /> Novo
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate font-mono text-[12.5px] text-muted-foreground" title={r.username}>
                                                @{r.username}
                                            </p>
                                        </div>

                                        {canDelete && (
                                            <button
                                                type="button"
                                                aria-label={`Excluir ${r.name}`}
                                                title="Excluir pesquisador"
                                                disabled={deleting === r.username}
                                                onClick={() => handleDelete(r)}
                                                className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-all hover:bg-[#f3e0d9] hover:text-[#8a432f] disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-3 text-[12.5px] text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarClock className="size-3.5" />
                                            {since ? <>{since} · {formatDate(r.createdAt)}</> : formatDate(r.createdAt)}
                                        </span>
                                        {showCompany && company && (
                                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#ebeeeb] px-2.5 py-0.5 text-xs font-medium">
                                                <Building2 className="size-3 shrink-0" />
                                                <span className="truncate">{company}</span>
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
