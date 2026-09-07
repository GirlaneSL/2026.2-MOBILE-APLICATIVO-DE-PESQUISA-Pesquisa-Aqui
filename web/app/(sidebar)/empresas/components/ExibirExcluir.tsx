'use client';

import { useState, useEffect, ReactNode } from 'react';
import { getCompanies } from '@/lib/company';
import DialogLayout from '@/components/ui/dialogLayout';
import Tabela from '../../(home)/components/tabela';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    userName: string;
    profile: string;
    edit?: ReactNode;
    delete?: ReactNode;
}

type Column<T> = {
    key: keyof T;
    label: string;
    className?: string;
};

// Todas as colunas possíveis
const allCompanyColumns: readonly Column<Company>[] = [
    { key: 'legalName', label: 'Razão Legal' },
    { key: 'contactInformation', label: 'Contato' },
    { key: 'situation', label: 'Situação' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' },
];

const allAdminColumns: readonly Column<Admin>[] = [
    { key: 'name', label: 'Nome' },
    { key: 'userName', label: 'Nome de Usuário' },
    { key: 'profile', label: 'Tipo' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' },
];

interface ExibirEditarProps {
    allowActions?: boolean; // Controla se as ações aparecem
}

export default function ExibirEditar({ allowActions = true }: ExibirEditarProps) {
    const [activeTab, setActiveTab] = useState<'companies' | 'admins'>('companies');

    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);

    const [error, setError] = useState<string | null>(null);

    // Filtra as colunas caso allowActions seja false
    const companyColumns = allowActions
        ? allCompanyColumns
        : allCompanyColumns.filter((col) => col.key !== 'edit' && col.key !== 'delete');

    const adminColumns = allowActions
        ? allAdminColumns
        : allAdminColumns.filter((col) => col.key !== 'edit' && col.key !== 'delete');

    const handleEdit = (id: string, type: 'company' | 'admin') => {
        console.log(`Editar ${type}:`, id);
    };

    const handleDelete = (id: string, type: 'company' | 'admin') => {
        console.log(`Excluir ${type}:`, id);
    };

    const dummyAdmins: Omit<Admin, 'edit' | 'delete'>[] = [
        { id: '1', name: 'Administrador 1', userName: 'abroba', profile: 'ADM' },
    ];

    useEffect(() => {
        Promise.all([getCompanies(), Promise.resolve(dummyAdmins)])
            .then(([companiesData, adminsData]) => {
                // Formata empresas
                const formattedCompanies = companiesData.map((item: any) => ({
                    ...item,
                    situation: (
                        <Badge variant={item.situation === 'ACTIVE' ? 'default' : 'destructive'}>
                            {item.situation === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </Badge>
                    ),
                    ...(allowActions && {
                        edit: (
                            <Button variant="outline" size="sm" onClick={() => handleEdit(item.id, 'company')}>
                                Editar
                            </Button>
                        ),
                        delete: (
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, 'company')}>
                                Excluir
                            </Button>
                        ),
                    }),
                }));

                // Formata administradores
                const formattedAdmins = adminsData.map((item: any) => ({
                    ...item,
                    ...(allowActions && {
                        edit: (
                            <Button variant="outline" size="sm" onClick={() => handleEdit(item.id, 'admin')}>
                                Editar
                            </Button>
                        ),
                        delete: (
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, 'admin')}>
                                Excluir
                            </Button>
                        ),
                    }),
                }));

                setCompanies(formattedCompanies);
                setAdmins(formattedAdmins);
            })
            .catch((err) => {
                setError(err.message);
            })
            .finally(() => {
                setLoadingCompanies(false);
                setLoadingAdmins(false);
            });
    }, [allowActions]);

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