'use client';

import { useState, useEffect, ReactNode } from 'react';
import { updateCompanySituation, getCompanies } from '@/lib/company';
import Tabela from '../../(home)/components/tabela';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deleteUser, getUsersAdmin } from '@/lib/user';

import { Bolt } from 'lucide-react';
import toast from 'react-hot-toast';

// Importações do Modal de Edição
import DialogLayout from '@/components/ui/dialogLayout';
import FormEditarEmpresa from './formEditarEmpresas';
import FormEditarAdmin from '../../(home)/components/FormEditarAdmin';


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
    { key: 'delete', label: 'Status' },
];

const allAdminColumns: readonly Column<Admin>[] = [
    { key: 'name', label: 'Nome' },
    { key: 'username', label: 'Nome de Usuário' },
    { key: 'profile', label: 'Tipo' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' },
];

const PROFILE_TRANSLATION: Record<string, string> = {
    SUPERADMINISTRATOR: 'Super Administrador',
    ADMINISTRATOR: 'Administrador',
    RESEARCHER: 'Pesquisador'
};

interface ExibirEditarProps {
    allowActions?: boolean;
}

export interface RawCompany {
    id: number;
    legalName: string;
    contactInformation: string;
    situation: 'ACTIVE' | 'INACTIVE';
}

// Tipagem para o Modal de Confirmação visual
type ConfirmModalState = {
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    actionVariant: 'default' | 'destructive';
    onConfirm: () => void;
};

export default function ExibirEditar({ allowActions = true }: ExibirEditarProps) {
    const [rawCompanies, setRawCompanies] = useState<RawCompany[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    const [rawAdmins, setRawAdmins] = useState<Admin[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Estado que controla o modal de confirmação (Ativar/Desativar/Excluir)
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
        isOpen: false,
        title: '',
        description: '',
        actionLabel: '',
        actionVariant: 'default',
        onConfirm: () => { },
    });

    const closeConfirmModal = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    const companyColumns = allowActions
        ? allCompanyColumns
        : allCompanyColumns.filter((col) => col.key !== 'edit' && col.key !== 'delete');

    const adminColumns = allowActions
        ? allAdminColumns
        : allAdminColumns.filter((col) => col.key !== 'edit' && col.key !== 'delete');

    // Função que atualiza a tabela quando o formulário de edição é salvo com sucesso
    const handleCompanyUpdateSuccess = (updatedCompany: RawCompany) => {
        setRawCompanies((prev) =>
            prev.map((c) => (c.id === updatedCompany.id ? updatedCompany : c))
        );
    };

    const handleAdminUpdateSuccess = (updatedAdmin: Admin) => {
        setRawAdmins((prev) =>
            prev.map((a) => (a.id === String(updatedAdmin.id) ? updatedAdmin : a))
        );
    };

    const handleToggleCompanyStatus = async (id: number, currentStatus: 'ACTIVE' | 'INACTIVE') => {
        const isDeactivating = currentStatus === 'ACTIVE';
        const newStatus = isDeactivating ? 'INACTIVE' : 'ACTIVE';

        setActionError(null);
        const toastId = toast.loading(`${isDeactivating ? 'Desativando' : 'Ativando'} empresa...`);

        try {
            await updateCompanySituation(id, newStatus);

            setRawCompanies((prev) =>
                prev.map((c) => (c.id === id ? { ...c, situation: newStatus } : c))
            );

            toast.success(`Empresa ${isDeactivating ? 'desativada' : 'ativada'} com sucesso!`, { id: toastId });
        } catch (err) {
            setActionError(err instanceof Error ? err.message : `Erro ao ${isDeactivating ? 'desativar' : 'ativar'} empresa`);
            toast.error(`Falha ao ${isDeactivating ? 'desativar' : 'ativar'} empresa.`, { id: toastId });
        }
    };

    const handleDeactivateAdmin = async (username: string) => {
        setActionError(null);
        const toastId = toast.loading('Excluindo administrador...');

        try {
            await deleteUser(username);
            setRawAdmins((prev) => prev.filter((a) => a.username !== username));
            toast.success('Administrador excluído com sucesso!', { id: toastId });
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Erro ao excluir admin');
            toast.error('Falha ao excluir administrador.', { id: toastId });
        }
    };

    useEffect(() => {
        getUsersAdmin()
            .then((data) => setRawAdmins(data))
            .catch((error) => console.log(error))
            .finally(() => setLoadingAdmins(false));
    }, []);

    useEffect(() => {
        getCompanies()
            .then((data) => setRawCompanies(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoadingCompanies(false));
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
            // Modal de Edição (Nome e Contato) embutido no botão "Editar"
            edit: (
                <DialogLayout
                    triggerButtonVariant="outline"
                    dialogTrigger="Editar"
                    dialogTitle="Editar Empresa"
                    dialogDescription="Altere as informações de identificação da empresa abaixo."
                    dialogContent={
                        <FormEditarEmpresa
                            company={item}
                            onSuccess={handleCompanyUpdateSuccess}
                        />
                    }
                />
            ),
            // Botão de Status (Abre o modal de confirmação)
            delete: (
                <Button
                    variant={item.situation === 'ACTIVE' ? 'destructive' : 'secondary'}
                    size="sm"
                    onClick={() => {
                        setConfirmModal({
                            isOpen: true,
                            title: item.situation === 'ACTIVE' ? 'Desativar Empresa' : 'Ativar Empresa',
                            description: item.situation === 'ACTIVE'
                                ? `Desativar a empresa "${item.legalName}" impedirá o acesso de todos os seus usuários (administradores e pesquisadores) ao sistema. Deseja continuar?`
                                : `Ativar a empresa "${item.legalName}" restaurará imediatamente o acesso de todos os seus usuários ao sistema. Deseja continuar?`,
                            actionLabel: item.situation === 'ACTIVE' ? 'Sim, desativar' : 'Sim, ativar',
                            actionVariant: item.situation === 'ACTIVE' ? 'destructive' : 'default',
                            onConfirm: () => {
                                handleToggleCompanyStatus(item.id, item.situation);
                                closeConfirmModal();
                            }
                        });
                    }}
                >
                    {item.situation === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                </Button>
            ),
        }),
    }));

    const admins: Admin[] = rawAdmins.map((item) => ({
        id: String(item.id),
        name: item.name,
        username: item.username,
        profile: PROFILE_TRANSLATION[item.profile] ?? item.profile,
        ...(allowActions && {
            edit: (
                <DialogLayout
                    triggerButtonVariant="outline"
                    dialogTrigger="Editar"
                    dialogTitle="Editar Administrador"
                    dialogDescription="Altere os dados de acesso deste usuário."
                    dialogContent={
                        <FormEditarAdmin
                            admin={item}
                            onSuccess={handleAdminUpdateSuccess}
                        />
                    }
                />
            ),
            delete: (
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                        setConfirmModal({
                            isOpen: true,
                            title: 'Excluir Administrador',
                            description: `Tem certeza que deseja excluir o administrador "${item.name}"? Isso impedirá o acesso dele ao sistema para sempre.`,
                            actionLabel: 'Sim, excluir',
                            actionVariant: 'destructive',
                            onConfirm: () => {
                                handleDeactivateAdmin(item.username);
                                closeConfirmModal();
                            }
                        });
                    }}
                >
                    Excluir
                </Button>
            ),
        }),
    }));


    return (
        <>
            <Tabs defaultValue="companies" className="w-full">
                <TabsList className="grid grid-cols-2 gap-2 w-fit sticky top-0 z-10 px-5 verde-marrom shadow border-t">
                    <Bolt size={13} className="absolute left-1 top-1/2 -translate-y-1/2 opacity-15" />
                    <Bolt size={13} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-15" />
                    <TabsTrigger value="companies">
                        Empresas <Badge variant="outline">{companies.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="admins">
                        Administradores <Badge variant="outline">{admins.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                {error && <p className="text-sm text-destructive">Erro: {error}</p>}
                {actionError && <p className="text-sm text-destructive">{actionError}</p>}

                <TabsContent value="companies" className="mt-0">
                    {loadingCompanies ? (
                        <p className="text-sm text-muted-foreground">Carregando empresas...</p>
                    ) : companies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
                    ) : (
                        <Tabela<Company> columns={companyColumns} data={companies} />
                    )}
                </TabsContent>

                <TabsContent value="admins" className="mt-0">
                    {loadingAdmins ? (
                        <p className="text-sm text-muted-foreground">Carregando administradores...</p>
                    ) : admins.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum administrador encontrado.</p>
                    ) : (
                        <Tabela<Admin> columns={adminColumns} data={admins} />
                    )}
                </TabsContent>
            </Tabs>

            {/* Modal de confirmação */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md flex flex-col gap-4 rounded-lg border bg-background p-6 shadow-lg animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-lg font-semibold tracking-tight text-foreground">
                                {confirmModal.title}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {confirmModal.description}
                            </p>
                        </div>
                        <div className="mt-2 flex justify-end gap-3">
                            <Button variant="outline" onClick={closeConfirmModal}>
                                Cancelar
                            </Button>
                            <Button variant={confirmModal.actionVariant} onClick={confirmModal.onConfirm}>
                                {confirmModal.actionLabel}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
