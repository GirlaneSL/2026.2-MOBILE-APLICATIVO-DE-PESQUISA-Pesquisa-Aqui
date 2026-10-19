'use client'

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteUser, UserItem } from "@/lib/user";
import { ReactNode, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Tabela from "../../(home)/components/tabela";

interface Row {
    name: string;
    username: string;
    company: ReactNode;
    createdAt: string;
    delete?: ReactNode;
}

type Column = { key: keyof Row; label: string };

interface ListaPesquisadoresProps {
    researchers: UserItem[];
    companyNames: Record<number, string>;
    loading: boolean;
    canDelete: boolean;
    showCompany: boolean;
    onDeleted: (username: string) => void;
    /** Limita a altura da listagem (uso em card). */
    maxHeightClassName?: string;
}

const normalize = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

export default function ListaPesquisadores({
    researchers,
    companyNames,
    loading,
    canDelete,
    showCompany,
    onDeleted,
    maxHeightClassName = "max-h-96",
}: ListaPesquisadoresProps) {
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const term = normalize(search.trim());
        if (!term) return researchers;

        return researchers.filter((r) =>
            normalize(r.name).includes(term) ||
            normalize(r.username).includes(term) ||
            normalize(companyNames[r.companyId ?? -1] ?? '').includes(term)
        );
    }, [researchers, search, companyNames]);

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
        name: r.name,
        username: r.username,
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

    return (
        <div className="flex flex-col gap-3">
            <Input
                placeholder="Buscar por nome, usuário ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar pesquisadores"
            />

            {loading ? (
                <p className="text-sm text-muted-foreground">Carregando pesquisadores...</p>
            ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {researchers.length === 0
                        ? 'Nenhum pesquisador cadastrado. Use "Novo pesquisador" para começar.'
                        : 'Nenhum pesquisador encontrado para a busca.'}
                </p>
            ) : (
                <div className={`${maxHeightClassName} overflow-auto`}>
                    <Tabela<Row> columns={columns} data={rows} />
                </div>
            )}
        </div>
    );
}
