'use client';

import { useState, useEffect, ReactNode } from 'react';
import { deactivate, getCompanies } from '@/lib/company';
import Tabela from '../../(home)/components/tabela';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteUser, getUsersAdmin } from '@/lib/user';

interface Company {
    id: string;
    legalName: string;
    contactInformation: string;
    situation: ReactNode;
    edit?: ReactNode;
    delete?: ReactNode;
}

interface Admin {
    id: string;
    name: string;
    username: string;
    profile: string;
    edit?: ReactNode;
    delete?: ReactNode;
}

type Column<T> = {
    key: keyof T;
    label: string;
    className?: string;
};

const allCompanyColumns: readonly Column<Company>[] = [
    { key: 'legalName', label: 'Razão Legal' },
    { key: 'contactInformation', label: 'Contato' },
    { key: 'situation', label: 'Situação' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' },
];

const allAdminColumns: readonly Column<Admin>[] = [
    { key: 'name', label: 'Nome' },
    { key: 'username', label: 'Nome de Usuário' },
    { key: 'profile', label: 'Tipo' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' },
];

interface ExibirEditarProps {
    allowActions?: boolean;
}

interface RawCompany {
    id: number;
    legalName: string;
    contactInformation: string;
    situation: 'ACTIVE' | 'INACTIVE';
}

export default function ExibirEditar({ allowActions = true }: ExibirEditarProps) {
    const [activeTab, setActiveTab] = useState<'companies' | 'admins'>('companies');

    const [rawCompanies, setRawCompanies] = useState<RawCompany[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    const [rawAdmins, setRawAdmins] = useState<Admin[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const companyColumns = allowActions
        ? allCompanyColumns
        : allCompanyColumns.filter((col) => col.key !== 'edit' && col.key !== 'delete');

    const adminColumns = allowActions
        ? allAdminColumns
        : allAdminColumns.filter((col) => col.key !== 'edit' && col.key !== 'delete');

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
            })
    }, [])

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

    const companies: Company[] = rawCompanies.map((item) => ({
        ...item,
        id: String(item.id),
        situation: (
            <Badge variant={item.situation === 'ACTIVE' ? 'default' : 'destructive'}>
                {item.situation === 'ACTIVE' ? 'Ativo' : 'Inativo'}
            </Badge>
        ),
        ...(allowActions && {
            edit: (
                <Button variant="outline" size="sm" onClick={() => handleEdit(String(item.id), 'company')}>
                    Editar
                </Button>
            ),
            delete: (
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={item.situation === 'INACTIVE'}
                    onClick={() => handleDeactivateCompany(String(item.id))}
                >
                    {item.situation === 'INACTIVE' ? 'Desativada' : 'Excluir'}
                </Button>
            ),
        }),
    }));

    const admins: Admin[] = rawAdmins.map((item) => ({
        id: String(item.id),
        name: item.name,
        username: item.username,
        profile: item.profile,
        ...(allowActions && {
            edit: (
                <Button variant="outline" size="sm" onClick={() => handleEdit(String(item.id), 'admin')}>
                    Editar
                </Button>
            ),
            delete: (
                <Button variant="destructive" size="sm" onClick={() => handleDeactivateAdmin(String(item.username))}>
                    Excluir
                </Button>
            ),
        }),
    }))

    return (
        <div className="flex flex-col gap-4 ">
            <div className="flex items-center gap-2 border-b pb-3">
                <Button
                    variant={activeTab === 'companies' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('companies')}
                >
                    Empresas ({companies.length})
                </Button>
                <Button
                    variant={activeTab === 'admins' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('admins')}
                >
                    Administradores ({admins.length})
                </Button>
            </div>

            {error && <p className="text-sm text-red-500">Erro: {error}</p>}
            {actionError && <p className="text-sm text-red-500">{actionError}</p>}

            {activeTab === 'companies' && (
                <div>
                    {loadingCompanies ? (
                        <p className="text-sm text-muted-foreground">Carregando empresas...</p>
                    ) : companies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
                    ) : (
                        <Tabela<Company> columns={companyColumns} data={companies} />
                    )}
                </div>
            )}

            {activeTab === 'admins' && (
                <div>
                    {loadingAdmins ? (
                        <p className="text-sm text-muted-foreground">Carregando administradores...</p>
                    ) : admins.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum administrador encontrado.</p>
                    ) : (
                        <Tabela<Admin> columns={adminColumns} data={admins} />
                    )}
                </div>
            )}
        </div>
    );
}