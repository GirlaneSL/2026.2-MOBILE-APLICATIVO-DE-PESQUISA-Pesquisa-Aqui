'use client'

import { Button } from "@/components/ui/button";
import { Contour } from "@/components/ui/contour";
import {
    DataTable,
    DataTableHeader,
    DataTableToolbar,
    Muted,
    PersonCell,
    RowActions,
    TableChip,
    TableEmpty,
    TableFilters,
    TableSearch,
    TableViewControls,
    type DataColumn,
} from "@/components/ui/data-table";
import { LoadingState } from "@/components/ui/loadingState";
import { avatarTone, initialsOf } from "@/lib/fieldData";
import { deleteUser, setUserSituation, UserItem } from "@/lib/user";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import EditUserDialog from "@/components/ui/edit-user-dialog";
import { Building2, CalendarClock, Pencil, Power, PowerOff, Sparkles, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
type ViewMode = 'cards' | 'table';
type SortMode = 'recent' | 'name';
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface ListaPesquisadoresProps {
    researchers: UserItem[];
    companyNames: Record<number, string>;
    loading: boolean;
    canDelete: boolean;
    /** Mostra o botão Editar (nome, usuário e senha). */
    canEdit?: boolean;
    /** Mostra o botão Desativar/Reativar (o acesso do pesquisador é bloqueado, as coletas ficam salvas). */
    canDeactivate?: boolean;
    showCompany: boolean;
    onDeleted: (username: string) => void;
    onUpdated?: (user: UserItem) => void;
    /** Momento de referência (ms) para "há X dias" e para o selo "Novo". */
    referenceTime?: number;
    /** Limita a altura da listagem (uso em card). */
    maxHeightClassName?: string;
}

const DAY = 24 * 60 * 60 * 1000;

/** Usuário sem o campo (resposta antiga) conta como ativo. */
const isActive = (u: UserItem) => u.situation !== 'INACTIVE';

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

export default function ListaPesquisadores({
    researchers,
    companyNames,
    loading,
    canDelete,
    canEdit = false,
    canDeactivate = false,
    showCompany,
    onDeleted,
    onUpdated,
    referenceTime = 0,
    maxHeightClassName = "max-h-96",
}: ListaPesquisadoresProps) {
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);
    const [editing, setEditing] = useState<UserItem | null>(null);
    const [togglingSituation, setTogglingSituation] = useState<string | null>(null);
    const [status, setStatus] = useState<StatusFilter>('ALL');
    const [view, setView] = useState<ViewMode>('table');
    const [sort, setSort] = useState<SortMode>('recent');

    const filtered = useMemo(() => {
        const term = normalize(search.trim());
        const matching = !term
            ? researchers
            : researchers.filter((r) =>
                normalize(r.name).includes(term) ||
                normalize(r.username).includes(term) ||
                normalize(companyNames[r.companyId ?? -1] ?? '').includes(term)
            );
        const base = status === 'ALL' ? matching : matching.filter((r) => isActive(r) === (status === 'ACTIVE'));

        return [...base].sort((a, b) =>
            sort === 'name'
                ? a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
                : timeValue(b.createdAt) - timeValue(a.createdAt)
        );
    }, [researchers, search, companyNames, sort, status]);

    const activeCount = researchers.filter(isActive).length;
    const inactiveCount = researchers.length - activeCount;

    const isNew = (r: UserItem) =>
        !!referenceTime && timeValue(r.createdAt) >= referenceTime - 30 * DAY;

    const handleDelete = async (user: UserItem) => {
        const confirmed = await confirmDialog({
            title: "Excluir pesquisador",
            description: `Tem certeza que deseja excluir o pesquisador "${user.name}"? Ele perderá o acesso ao sistema.`,
            confirmLabel: "Excluir",
            variant: "destructive",
        });
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

    const handleToggleSituation = async (user: UserItem) => {
        const deactivating = isActive(user);

        if (deactivating) {
            const confirmed = await confirmDialog({
                title: "Desativar pesquisador",
                description: `Tem certeza que deseja desativar o pesquisador "${user.name}"? Ele não conseguirá entrar no sistema nem no aplicativo até ser reativado. As coletas já registradas continuam salvas.`,
                confirmLabel: "Desativar",
                variant: "destructive",
            });
            if (!confirmed) return;
        }

        setTogglingSituation(user.username);
        try {
            const updated = await setUserSituation(user.username, deactivating ? 'INACTIVE' : 'ACTIVE');
            toast.success(deactivating ? "Pesquisador desativado" : "Pesquisador reativado");
            onUpdated?.(updated);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Erro ao alterar a situação do pesquisador");
        } finally {
            setTogglingSituation(null);
        }
    };

    const columns: DataColumn<UserItem>[] = [
        {
            id: 'name',
            header: 'Pesquisador',
            minWidth: '14rem',
            cell: (r) => (
                <PersonCell
                    id={r.id}
                    name={r.name}
                    username={r.username}
                    badge={isNew(r) ? <TableChip tone="live">Novo</TableChip> : undefined}
                />
            ),
        },
        ...(showCompany
            ? [{
                id: 'company',
                header: 'Empresa',
                cell: (r: UserItem) => companyNames[r.companyId ?? -1] ?? <Muted>—</Muted>,
            } as DataColumn<UserItem>]
            : []),
        {
            id: 'situation',
            header: 'Situação',
            cell: (r) =>
                isActive(r) ? <TableChip tone="live">Ativo</TableChip> : <TableChip tone="off">Inativo</TableChip>,
        },
        {
            id: 'createdAt',
            header: 'Cadastrado em',
            cell: (r) => {
                const since = relativeDays(r.createdAt, referenceTime);
                return (
                    <div>
                        {formatDate(r.createdAt)}
                        {since && <small>{since}</small>}
                    </div>
                );
            },
        },
        ...(canDelete || canEdit || canDeactivate
            ? [{
                id: 'actions',
                header: 'Ações',
                hideHeader: true,
                align: 'right',
                cell: (r: UserItem) => (
                    <RowActions>
                        {canEdit && (
                            <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
                                Editar
                            </Button>
                        )}
                        {canDeactivate && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={togglingSituation === r.username}
                                onClick={() => handleToggleSituation(r)}
                            >
                                {togglingSituation === r.username ? 'Aguarde...' : isActive(r) ? 'Desativar' : 'Reativar'}
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={deleting === r.username}
                                onClick={() => handleDelete(r)}
                            >
                                {deleting === r.username ? 'Excluindo...' : 'Excluir'}
                            </Button>
                        )}
                    </RowActions>
                ),
            } as DataColumn<UserItem>]
            : []),
    ];

    const hasQuery = search.trim().length > 0;

    const emptyState = (
        <TableEmpty
            icon={researchers.length > 0 ? undefined : <UsersRound />}
            title={researchers.length > 0 ? 'Nenhum pesquisador encontrado' : 'Sua equipe de campo começa aqui'}
            text={
                researchers.length > 0
                    ? 'Tente outro nome, usuário ou empresa.'
                    : 'Use "Novo pesquisador" para cadastrar quem vai coletar em campo.'
            }
            onClear={researchers.length > 0 ? () => { setSearch(''); setStatus('ALL'); } : undefined}
        />
    );

    return (
        <div className="flex flex-col">
            <DataTableHeader
                title="Pesquisadores"
                count={hasQuery ? `${filtered.length} de ${researchers.length}` : researchers.length}
            />

            <DataTableToolbar>
                <TableSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por nome, usuário ou empresa..."
                    label="Buscar pesquisadores"
                />
                <div className="grow flex flex-wrap items-center gap-2">
                    {!loading && researchers.length > 0 && (inactiveCount > 0 || status !== 'ALL') && (
                        <TableFilters<StatusFilter>
                            label="Situação"
                            value={status}
                            onChange={setStatus}
                            options={[
                                { value: 'ALL', label: 'Todos', count: researchers.length },
                                { value: 'ACTIVE', label: 'Ativos', count: activeCount },
                                { value: 'INACTIVE', label: 'Inativos', count: inactiveCount },
                            ]}
                        />
                    )}
                    <TableViewControls sort={sort} onSortChange={setSort} view={view} onViewChange={setView} />
                </div>
            </DataTableToolbar>

            {/* Conteúdo */}
            {loading ? (
                <LoadingState label="Carregando pesquisadores..." shape={view === 'table' ? 'table' : 'people'} columns={4} />
            ) : filtered.length === 0 ? (
                emptyState
            ) : view === 'table' ? (
                <DataTable
                    label="Pesquisadores"
                    columns={columns}
                    rows={filtered}
                    getRowKey={(r) => r.id ?? r.username}
                    className={maxHeightClassName}
                />
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
                                    className={`group relative flex flex-col gap-4 overflow-hidden rounded-[22px] border border-border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6d0c9] hover:shadow-[0_20px_34px_-26px_rgba(10,20,16,0.45)] ${isActive(r) ? 'bg-white' : 'bg-[#f6f7f6]'}`}
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
                                                {!isActive(r) && (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f3e0d9] px-2 py-0.5 text-[11px] font-semibold text-[#8a432f]">
                                                        <PowerOff className="size-3" /> Inativo
                                                    </span>
                                                )}
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

                                        {(canEdit || canDelete || canDeactivate) && (
                                            <div className="flex shrink-0 items-center gap-1">
                                                {canDeactivate && (
                                                    <button
                                                        type="button"
                                                        aria-label={`${isActive(r) ? 'Desativar' : 'Reativar'} ${r.name}`}
                                                        title={isActive(r) ? 'Desativar pesquisador' : 'Reativar pesquisador'}
                                                        disabled={togglingSituation === r.username}
                                                        onClick={() => handleToggleSituation(r)}
                                                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-all hover:bg-[#e9ede9] hover:text-foreground disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                                                    >
                                                        {isActive(r) ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                                                    </button>
                                                )}
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        aria-label={`Editar ${r.name}`}
                                                        title="Editar pesquisador"
                                                        onClick={() => setEditing(r)}
                                                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-all hover:bg-[#e9ede9] hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                                                    >
                                                        <Pencil className="size-4" />
                                                    </button>
                                                )}
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

            {canEdit && (
                <EditUserDialog
                    user={editing}
                    role="pesquisador"
                    onOpenChange={(open) => { if (!open) setEditing(null); }}
                    onSaved={(updated) => onUpdated?.(updated)}
                />
            )}
        </div>
    );
}
