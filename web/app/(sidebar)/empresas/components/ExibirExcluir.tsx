'use client';

import { useState, useEffect, useMemo } from 'react';
import { deactivate, getCompanies } from '@/lib/company';
import { deleteUser, getUsersAdmin } from '@/lib/user';
import { Button } from '@/components/ui/button';
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
    TableTabs,
    type DataColumn,
} from '@/components/ui/data-table';
import { Building2, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

interface Admin {
    id: string;
    name: string;
    username: string;
    profile: string;
}

interface ExibirEditarProps {
    allowActions?: boolean;
    /** Chamado depois que um administrador é excluído, para a página manter contadores e gráficos em dia. */
    onAdminDeleted?: (username: string) => void;
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

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
};

export default function ExibirEditar({ allowActions = true, onAdminDeleted }: ExibirEditarProps) {
    const [rawCompanies, setRawCompanies] = useState<RawCompany[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    const [rawAdmins, setRawAdmins] = useState<Admin[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [deletingAdmin, setDeletingAdmin] = useState<string | null>(null);

    const [tab, setTab] = useState<Tab>('companies');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<StatusFilter>('ALL');

    const handleEdit = (id: string, type: 'company' | 'admin') => {
        console.log(`Editar ${type}:`, id);
    };

    const handleDeactivateCompany = async (id: string) => {
        const company = rawCompanies.find((c) => String(c.id) === id);

        const confirmed = await confirmDialog({
            title: 'Desativar empresa',
            description: `Tem certeza que deseja desativar a empresa "${company?.legalName ?? id}"? Isso impedirá o acesso de todos os usuários dela ao sistema.`,
            confirmLabel: 'Desativar',
            variant: 'destructive',
        });
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
        const admin = rawAdmins.find((a) => a.username === username);

        const confirmed = await confirmDialog({
            title: 'Excluir administrador',
            description: `Tem certeza que deseja excluir o administrador "${admin?.name ?? username}"? Ele perderá o acesso ao sistema e esta ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
            variant: 'destructive',
        });
        if (!confirmed) return;

        setActionError(null);
        setDeletingAdmin(username);

        try {
            await deleteUser(username);

            setRawAdmins((prev) => prev.filter((a) => a.username !== username));
            onAdminDeleted?.(username);
            toast.success(`Administrador "${admin?.name ?? username}" excluído`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Erro ao excluir administrador');
        } finally {
            setDeletingAdmin(null);
        }
    };

    useEffect(() => {
        getUsersAdmin()
            .then((data) => {
                setRawAdmins(data);
            })
            .catch((error) => {
                console.log(error);
                toast.error('Erro ao carregar administradores');
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

    const companyColumns: DataColumn<RawCompany>[] = [
        {
            id: 'name',
            header: 'Empresa',
            minWidth: '14rem',
            cell: (c) => (
                <PersonCell
                    id={c.id}
                    name={c.legalName}
                    sub={formatDate(c.createdAt) ? `Desde ${formatDate(c.createdAt)}` : undefined}
                    square
                />
            ),
        },
        {
            id: 'contact',
            header: 'Contato',
            cell: (c) => c.contactInformation || <Muted>Sem contato</Muted>,
        },
        {
            id: 'status',
            header: 'Situação',
            cell: (c) =>
                c.situation === 'ACTIVE' ? (
                    <TableChip tone="live">Ativa</TableChip>
                ) : (
                    <TableChip tone="off">Inativa</TableChip>
                ),
        },
        ...(allowActions
            ? [{
                id: 'actions',
                header: 'Ações',
                hideHeader: true,
                align: 'right',
                cell: (c: RawCompany) => (
                    <RowActions>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(String(c.id), 'company')}>
                            Editar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={c.situation !== 'ACTIVE'}
                            onClick={() => handleDeactivateCompany(String(c.id))}
                        >
                            {c.situation === 'ACTIVE' ? 'Desativar' : 'Desativada'}
                        </Button>
                    </RowActions>
                ),
            } as DataColumn<RawCompany>]
            : []),
    ];

    const adminColumns: DataColumn<Admin>[] = [
        {
            id: 'name',
            header: 'Administrador',
            minWidth: '14rem',
            cell: (a) => <PersonCell id={Number(a.id) || a.name.length} name={a.name} username={a.username} />,
        },
        {
            id: 'profile',
            header: 'Perfil',
            cell: (a) => <TableChip tone="done">{PROFILE_TRANSLATION[a.profile] ?? a.profile}</TableChip>,
        },
        ...(allowActions
            ? [{
                id: 'actions',
                header: 'Ações',
                hideHeader: true,
                align: 'right',
                cell: (a: Admin) => (
                    <RowActions>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(String(a.id), 'admin')}>
                            Editar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingAdmin !== null}
                            onClick={() => handleDeactivateAdmin(String(a.username))}
                        >
                            {deletingAdmin === a.username ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </RowActions>
                ),
            } as DataColumn<Admin>]
            : []),
    ];

    const total = tab === 'companies' ? rawCompanies.length : rawAdmins.length;
    const shown = tab === 'companies' ? companies.length : admins.length;

    return (
        <div className="flex flex-col">
            <TableTabs<Tab>
                label="Listas"
                value={tab}
                onChange={switchTab}
                options={[
                    { value: 'companies', label: 'Empresas', count: rawCompanies.length, icon: <Building2 /> },
                    { value: 'admins', label: 'Administradores', count: rawAdmins.length, icon: <UsersRound /> },
                ]}
            />

            <DataTableHeader
                title={tab === 'companies' ? 'Empresas cadastradas' : 'Administradores cadastrados'}
                count={hasFilter ? `${shown} de ${total}` : total}
            />

            <DataTableToolbar>
                <TableSearch
                    value={search}
                    onChange={setSearch}
                    placeholder={tab === 'companies' ? 'Buscar empresa ou contato...' : 'Buscar nome ou usuário...'}
                    label="Buscar"
                />
                <div className="grow flex flex-wrap items-center gap-2">
                    {tab === 'companies' && !loadingCompanies && rawCompanies.length > 0 && (
                        <TableFilters<StatusFilter>
                            label="Situação"
                            value={status}
                            onChange={setStatus}
                            options={[
                                { value: 'ALL', label: 'Todas', count: rawCompanies.length },
                                { value: 'ACTIVE', label: 'Ativas', count: activeCount },
                                { value: 'INACTIVE', label: 'Inativas', count: inactiveCount },
                            ]}
                        />
                    )}
                </div>
            </DataTableToolbar>

            {error && <p className="mb-3 text-sm text-destructive">Erro: {error}</p>}
            {actionError && <p className="mb-3 rounded-xl bg-[#f3e0d9] px-3.5 py-2 text-sm text-[#8a432f]">{actionError}</p>}

            {tab === 'companies' ? (
                <DataTable
                    label="Empresas"
                    columns={companyColumns}
                    rows={companies}
                    getRowKey={(c) => c.id}
                    loading={loadingCompanies}
                    loadingLabel="Carregando empresas..."
                    empty={
                        <TableEmpty
                            icon={hasFilter ? undefined : <Building2 />}
                            title={hasFilter ? 'Nada encontrado' : 'Nenhuma empresa cadastrada ainda.'}
                            onClear={hasFilter ? clear : undefined}
                        />
                    }
                />
            ) : (
                <DataTable
                    label="Administradores"
                    columns={adminColumns}
                    rows={admins}
                    getRowKey={(a) => a.id}
                    loading={loadingAdmins}
                    loadingLabel="Carregando administradores..."
                    empty={
                        <TableEmpty
                            icon={hasFilter ? undefined : <UsersRound />}
                            title={hasFilter ? 'Nada encontrado' : 'Nenhum administrador cadastrado ainda.'}
                            onClear={hasFilter ? clear : undefined}
                        />
                    }
                />
            )}
        </div>
    );
}
