'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import Tabela from '../../(home)/components/tabela';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteResearch, getResearches } from '@/lib/research';
import DialogLayout from '@/components/ui/dialogLayout';
import ModalEditarPesquisa from './ModalEditarPesquisa';
import toast from 'react-hot-toast';

export interface Research {
    id: number | string;
    title: string;
    description?: string;
    objective?: string;
    startDate?: string;
    endDate?: string;
    targetAudience?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | string;
    createdAt?: string;
    [key: string]: any;
}

interface FormattedResearch {
    id: string;
    title: ReactNode;
    status: ReactNode;
    createdAt?: string;
    edit?: ReactNode;
    delete?: ReactNode;
}

type Column<T> = {
    key: keyof T;
    label: string;
    className?: string;
};

const allResearchColumns: readonly Column<FormattedResearch>[] = [
    { key: 'title', label: 'Título' },
    { key: 'createdAt', label: 'Criada em' },
    { key: 'status', label: 'Situação' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' },
];

interface TabelaPesquisasProps {
    allowActions?: boolean;
    refreshTrigger?: number;
    onChange?: () => void;
}

export default function TabelaPesquisas({ allowActions = true, refreshTrigger = 0, onChange }: TabelaPesquisasProps) {
    const [rawResearches, setRawResearches] = useState<Research[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const columns = allowActions
        ? allResearchColumns
        : allResearchColumns.filter((col) => col.key !== 'edit' && col.key !== 'delete');

    useEffect(() => {
        setLoading(true);
        getResearches()
            .then((data) => setRawResearches(data))
            .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar pesquisas'))
            .finally(() => setLoading(false));
    }, [refreshTrigger]);

    const handleUpdateSuccess = (updatedItem: Research) => {
        setRawResearches((prev) =>
            prev.map((item) => (String(item.id) === String(updatedItem.id) ? updatedItem : item))
        );
        if (onChange) {
            onChange();
        }
    };

    const executeDelete = async (id: string, toastId: string) => {
        toast.dismiss(toastId);
        setActionError(null);

        try {
            await deleteResearch(+id)
            setRawResearches((prev) => prev.filter((r) => String(r.id) !== id));
            toast.success('Pesquisa excluída com sucesso!');
            
            if (onChange) {
                onChange();
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Erro ao excluir pesquisa';
            setActionError(errorMsg);
            toast.error(errorMsg);
        }
    };

    const handleDelete = (id: string) => {
        const item = rawResearches.find((r) => String(r.id) === id);

        toast(
            (t) => (
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">
                        Tem certeza que deseja excluir &quot;{item?.title ?? id}&quot;?
                    </span>
                    <div className="flex justify-end gap-2 pt-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.dismiss(t.id)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => executeDelete(id, t.id)}
                        >
                            Excluir
                        </Button>
                    </div>
                </div>
            ),
            {
                duration: 6000,
                id: `delete-${id}`,
            }
        );
    };

    const researches: FormattedResearch[] = rawResearches.map((item) => ({
        id: String(item.id),
        title: (
            <Link
                href={`/pesquisas/${item.id}`}
                className="font-medium hover:underline hover:text-[#447762] transition-colors block"
            >
                {item.title}
            </Link>
        ),
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-',
        status: (
            <Badge variant={item.status === 'ACTIVE' || !item.status ? 'default' : 'outline'}>
                {item.status === 'ACTIVE' ? 'Ativa' : item.status || 'Ativa'}
            </Badge>
        ),
        ...(allowActions && {
            edit: (
                <DialogLayout
                    dialogTitle={`Editar: ${item.title}`}
                    dialogTrigger="Editar"
                    dialogDescription="Atualize as informações da pesquisa abaixo."
                    dialogContent={
                        <ModalEditarPesquisa
                            research={item}
                            onSuccess={handleUpdateSuccess}
                        />
                    }
                />
            ),
            delete: (
                <div>
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={item.status !== 'DRAFT'}
                        className="disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleDelete(String(item.id))}
                    >
                        Excluir
                    </Button>
                </div>
            ),
        }),
    }));

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3">
                <h2>
                    Quantidade <Badge variant="outline">{researches.length}</Badge>
                </h2>
            </div>

            {error && <p className="text-sm text-red-500">Erro: {error}</p>}
            {actionError && <p className="text-sm text-red-500">{actionError}</p>}

            {loading ? (
                <p className="text-sm text-muted-foreground">Carregando pesquisas...</p>
            ) : researches.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma pesquisa encontrada.</p>
            ) : (
                <Tabela<FormattedResearch> 
                    key={rawResearches.length} 
                    columns={columns} 
                    data={researches} 
                />
            )}
        </div>
    );
}