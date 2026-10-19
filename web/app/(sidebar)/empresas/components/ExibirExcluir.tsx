'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { deactivate, getCompanies } from '@/lib/company';
import { deleteUser, getUsersAdmin } from '@/lib/user';
import { Contour } from '@/components/ui/contour';
import {
    Building2,
    Pencil,
    Phone,
    Power,
    Search,
    SearchX,
    ShieldCheck,
    Trash2,
    UsersRound,
    X,
} from 'lucide-react';

interface Admin {
    id: string;
    name: string;
    username: string;
    profile: string;
}

interface ExibirEditarProps {
    allowActions?: boolean;
}

interface RawCompany {
    id: number;
    legalName: string;
    contactInformation: string;
    situation: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
}

type Tab = 'companies' | 'admins';
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

// Dicionário para traduzir os perfis no front-end
const PROFILE_TRANSLATION: Record<string, string> = {
    SUPERADMINISTRATOR: 'Super Administrador',
    ADMINISTRATOR: 'Administrador',
    RESEARCHER: 'Pesquisador',
};

const TONES = [
    'bg-[#cfe3d8] text-[#1f3a2f]',
    'bg-[#f0d5cb] text-[#7a3b29]',
    'bg-[#dfe6ef] text-[#2a3d57]',
    'bg-[#e6e0cc] text-[#5b4d1c]',
];

const toneOf = (n: number) => TONES[Math.abs(n) % TONES.length];

const initialsOf = (name?: string) =>
    (name ?? '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || '?';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
};

function Monogram({ name, seed, round = false }: { name: string; seed: number; round?: boolean }) {
    return (
        <div
            aria-hidden="true"
            className={`grid size-12 shrink-0 place-items-center text-[15px] font-bold ${
                round ? 'rounded-full' : 'rounded-2xl'
            } ${toneOf(seed)}`}
        >
            {initialsOf(name)}
        </div>
    );
}

function IconButton({
    label,
    onClick,
    disabled,
    danger,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={`grid size-9 place-items-center rounded-full border border-border bg-white text-muted-foreground transition-all disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4 ${
                danger
                    ? 'hover:border-[#e8c4b8] hover:bg-[#f3e0d9] hover:text-[#8a432f]'
                    : 'hover:border-[#c6d0c9] hover:bg-[#e4ece7] hover:text-ink'
            }`}
        >
            {children}
        </button>
    );
}

function StatusPill({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ${
                active ? 'bg-[#e4ece7] text-[var(--green-deep)]' : 'bg-[#f3e0d9] text-[#8a432f]'
            }`}
        >
            <span className={`size-1.5 rounded-full ${active ? 'bg-[var(--green)]' : 'bg-[#ab6049]'}`} />
            {active ? 'Ativa' : 'Inativa'}
        </span>
    );
}

function SkeletonRows() {
    return (
        <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-3 rounded-[20px] border border-border bg-white p-3">
                    <div className="size-12 rounded-2xl bg-muted" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-1/3 rounded-full bg-muted" />
                        <div className="h-3 w-1/4 rounded-full bg-muted" />
                    </div>
                    <div className="h-6 w-16 rounded-full bg-muted" />
                </div>
            ))}
        </div>
    );
}

function Empty({ filtered, text, onClear }: { filtered: boolean; text: string; onClear: () => void }) {
    return (
        <div className="relative overflow-hidden rounded-[20px] border border-dashed border-input bg-muted/40 px-6 py-10 text-center">
            <Contour seed={9} rings={8} cx={0.5} cy={0.5} size={1.1} style={{ opacity: 0.3 }} />
            <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="grid size-12 place-items-center rounded-2xl bg-white text-[var(--green-deep)] ring-1 ring-border">
                    {filtered ? <SearchX className="size-5" /> : <Building2 className="size-5" />}
                </div>
                <p className="text-sm font-semibold">{filtered ? 'Nada encontrado' : text}</p>
                {filtered && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3.5 text-[13px] font-medium hover:bg-muted"
                    >
                        <X className="size-3.5" /> Limpar filtros
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ExibirEditar({ allowActions = true }: ExibirEditarProps) {
    const [rawCompanies, setRawCompanies] = useState<RawCompany[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    const [rawAdmins, setRawAdmins] = useState<Admin[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [tab, setTab] = useState<Tab>('companies');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<StatusFilter>('ALL');

    const handleEdit = (id: string, type: 'company' | 'admin') => {
        console.log(`Editar ${type}:`, id);
    };

    const handleDeactivateCompany = async (id: string) => {
        const company = rawCompanies.find((c) => String(c.id) === id);

        const confirmed = window.confirm(
            `Tem certeza que deseja desativar a empresa "${company?.legalName ?? id}"? Isso impedirá o acesso de todos os usuários dela ao sistema.`
        );
        if (!confirmed) return;

        setActionError(null);

        try {
            await deactivate(+id);

            setRawCompanies((prev) =>
                prev.map((c) => (c.id === +id ? { ...c, situation: 'INACTIVE' } : c))
            );
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Erro ao desativar empresa');
        }
    };

    const handleDeactivateAdmin = async (username: string) => {
        const admins = rawAdmins.find((c) => String(c.username) === username);

        const confirmed = window.confirm(
            `Tem certeza que deseja excluir o admin "${admins?.name ?? username}"? Isso impedirá o acesso dele ao sistema.`
        );
        if (!confirmed) return;

        setActionError(null);

        try {
            await deleteUser(username);

            setRawAdmins((prev) => prev.filter((a) => a.username !== username));
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Erro ao excluir admin');
        }
    };

    useEffect(() => {
        getUsersAdmin()
            .then((data) => {
                setRawAdmins(data);
            })
            .catch((error) => {
                console.log(error);
                alert('Erro ao carregar admins');
            })
            .finally(() => {
                setLoadingAdmins(false);
            });
    }, []);

    useEffect(() => {
        getCompanies()
            .then((data) => {
                setRawCompanies(data);
            })
            .catch((err) => {
                setError(err.message);
            })
            .finally(() => {
                setLoadingCompanies(false);
            });
    }, []);

    const activeCount = rawCompanies.filter((c) => c.situation === 'ACTIVE').length;
    const inactiveCount = rawCompanies.length - activeCount;

    const term = normalize(search.trim());
    const hasFilter = term.length > 0 || (tab === 'companies' && status !== 'ALL');

    const companies = useMemo(
        () =>
            rawCompanies.filter(
                (c) =>
                    (status === 'ALL' || c.situation === status) &&
                    (!term ||
                        normalize(c.legalName).includes(term) ||
                        normalize(c.contactInformation ?? '').includes(term))
            ),
        [rawCompanies, status, term]
    );

    const admins = useMemo(
        () =>
            rawAdmins.filter(
                (a) => !term || normalize(a.name).includes(term) || normalize(a.username).includes(term)
            ),
        [rawAdmins, term]
    );

    const clear = () => {
        setSearch('');
        setStatus('ALL');
    };

    const switchTab = (t: Tab) => {
        setTab(t);
        setSearch('');
        setStatus('ALL');
    };

    const tabs: { value: Tab; label: string; count: number; icon: ReactNode }[] = [
        { value: 'companies', label: 'Empresas', count: rawCompanies.length, icon: <Building2 /> },
        { value: 'admins', label: 'Administradores', count: rawAdmins.length, icon: <UsersRound /> },
    ];

    const filters: { value: StatusFilter; label: string; count: number }[] = [
        { value: 'ALL', label: 'Todas', count: rawCompanies.length },
        { value: 'ACTIVE', label: 'Ativas', count: activeCount },
        { value: 'INACTIVE', label: 'Inativas', count: inactiveCount },
    ];

    return (
        <div className="flex flex-col gap-4">
            {/* Abas */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div
                    role="tablist"
                    aria-label="Listas"
                    className="inline-flex w-fit items-center gap-0.5 rounded-full border border-border bg-muted p-1"
                >
                    {tabs.map((t) => {
                        const on = t.value === tab;
                        return (
                            <button
                                key={t.value}
                                role="tab"
                                aria-selected={on}
                                type="button"
                                onClick={() => switchTab(t.value)}
                                className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium transition-all [&>span>svg]:size-4 ${
                                    on ? 'bg-ink text-white shadow-sm' : 'text-muted-foreground hover:text-ink'
                                }`}
                            >
                                <span>{t.icon}</span>
                                {t.label}
                                <span
                                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${
                                        on ? 'bg-white/15 text-[var(--mint)]' : 'bg-[#e0e5e1] text-muted-foreground'
                                    }`}
                                >
                                    {t.count}
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
                        aria-label="Buscar"
                        placeholder={tab === 'companies' ? 'Buscar empresa ou contato...' : 'Buscar nome ou usuário...'}
                        className="h-10 w-full rounded-full border border-input bg-muted/50 pl-10 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
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

            {/* Filtro de situação */}
            {tab === 'companies' && !loadingCompanies && rawCompanies.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {filters.map((f) => {
                        const on = f.value === status;
                        return (
                            <button
                                key={f.value}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setStatus(f.value)}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                                    on
                                        ? 'border-[var(--green-deep)] bg-[#e4ece7] text-[var(--green-deep)]'
                                        : 'border-border bg-white text-muted-foreground hover:border-[#c6d0c9] hover:text-ink'
                                }`}
                            >
                                {f.label}
                                <b className="font-semibold">{f.count}</b>
                            </button>
                        );
                    })}
                </div>
            )}

            {error && <p className="text-sm text-destructive">Erro: {error}</p>}
            {actionError && (
                <p className="rounded-xl bg-[#f3e0d9] px-3.5 py-2 text-sm text-[#8a432f]">{actionError}</p>
            )}

            {/* Empresas */}
            {tab === 'companies' &&
                (loadingCompanies ? (
                    <SkeletonRows />
                ) : companies.length === 0 ? (
                    <Empty filtered={hasFilter} text="Nenhuma empresa cadastrada ainda." onClear={clear} />
                ) : (
                    <ul className="flex flex-col gap-2.5">
                        {companies.map((c) => {
                            const active = c.situation === 'ACTIVE';
                            const since = formatDate(c.createdAt);

                            return (
                                <li
                                    key={c.id}
                                    className={`group relative flex flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden rounded-[20px] border bg-white p-3 pl-4 transition-all hover:-translate-y-px hover:border-[#c6d0c9] hover:shadow-[0_16px_28px_-22px_rgba(10,20,16,0.5)] ${
                                        active ? 'border-border' : 'border-[#ecd0c5] bg-[#fdf8f6]'
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${
                                            active ? 'bg-[var(--green)]' : 'bg-[#ab6049]'
                                        }`}
                                    />
                                    <Monogram name={c.legalName} seed={c.id} />

                                    <div className="min-w-0 flex-1 basis-48">
                                        <p className="truncate text-[15px] font-semibold tracking-tight" title={c.legalName}>
                                            {c.legalName}
                                        </p>
                                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-muted-foreground">
                                            <Phone className="size-3.5 shrink-0" />
                                            <span className="truncate">{c.contactInformation || 'Sem contato'}</span>
                                            {since && <span className="hidden shrink-0 sm:inline">· desde {since}</span>}
                                        </p>
                                    </div>

                                    <StatusPill active={active} />

                                    {allowActions && (
                                        <div className="flex items-center gap-1.5">
                                            <IconButton label="Editar empresa" onClick={() => handleEdit(String(c.id), 'company')}>
                                                <Pencil />
                                            </IconButton>
                                            <IconButton
                                                danger
                                                label={active ? 'Desativar empresa' : 'Empresa já desativada'}
                                                disabled={!active}
                                                onClick={() => handleDeactivateCompany(String(c.id))}
                                            >
                                                <Power />
                                            </IconButton>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ))}

            {/* Administradores */}
            {tab === 'admins' &&
                (loadingAdmins ? (
                    <SkeletonRows />
                ) : admins.length === 0 ? (
                    <Empty filtered={hasFilter} text="Nenhum administrador cadastrado ainda." onClear={clear} />
                ) : (
                    <ul className="flex flex-col gap-2.5">
                        {admins.map((a) => (
                            <li
                                key={a.id}
                                className="group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[20px] border border-border bg-white p-3 pl-4 transition-all hover:-translate-y-px hover:border-[#c6d0c9] hover:shadow-[0_16px_28px_-22px_rgba(10,20,16,0.5)]"
                            >
                                <Monogram name={a.name} seed={Number(a.id) || a.name.length} round />

                                <div className="min-w-0 flex-1 basis-48">
                                    <p className="truncate text-[15px] font-semibold tracking-tight" title={a.name}>
                                        {a.name}
                                    </p>
                                    <p className="truncate font-mono text-[12.5px] text-muted-foreground">@{a.username}</p>
                                </div>

                                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#ebeeeb] px-2.5 text-xs font-medium text-muted-foreground">
                                    <ShieldCheck className="size-3" />
                                    {PROFILE_TRANSLATION[a.profile] ?? a.profile}
                                </span>

                                {allowActions && (
                                    <div className="flex items-center gap-1.5">
                                        <IconButton label="Editar administrador" onClick={() => handleEdit(String(a.id), 'admin')}>
                                            <Pencil />
                                        </IconButton>
                                        <IconButton danger label="Excluir administrador" onClick={() => handleDeactivateAdmin(String(a.username))}>
                                            <Trash2 />
                                        </IconButton>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ))}
        </div>
    );
}
