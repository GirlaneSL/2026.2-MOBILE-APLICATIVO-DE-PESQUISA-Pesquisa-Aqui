'use client';

import { useState, useEffect, ReactNode, FormEvent } from 'react';
import Link from 'next/link';
import Tabela from '../../(home)/components/tabela';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getResearches } from '@/lib/research';
import DialogLayout from '@/components/ui/dialogLayout';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import MontarPesquisaForm from './MontarPesquiaForm';
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

interface FormEditarPesquisaProps {
    research: Research;
    onSuccess: (updated: Research) => void;
}

function FormEditarPesquisa({ research, onSuccess }: FormEditarPesquisaProps) {

    // Controle de abas interno do Dialog
    const [editTab, setEditTab] = useState<'info' | 'extra'>('info');

    const [title, setTitle] = useState(research.title || '');
    const [description, setDescription] = useState(research.description || '');
    const [objective, setObjective] = useState(research.objective || '');
    const [startDate, setStartDate] = useState(
        research.startDate ? research.startDate.split('T')[0] : ''
    );
    const [endDate, setEndDate] = useState(
        research.endDate ? research.endDate.split('T')[0] : ''
    );
    const [targetAudience, setTargetAudience] = useState(research.targetAudience || '');
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const datesValid = !startDate || !endDate || startDate <= endDate;

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!datesValid) return;

        setIsLoading(true);
        setSubmitError(null);

        const updatedData = {
            ...research,
            title,
            description,
            objective,
            startDate,
            endDate,
            targetAudience,
        };

        try {
            const response = await fetch(`http://localhost:3001/research/${research.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updatedData),
            });

            if (!response.ok) {
                throw new Error('Falha ao atualizar a pesquisa.');
            }

            const savedItem = await response.json().catch(() => updatedData);
            onSuccess(savedItem);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar alterações.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Navegação entre as seções dentro do Modal */}
            <div className="flex items-center gap-2 border-b pb-2">
                <Button
                    type="button"
                    variant={editTab === 'info' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditTab('info')}
                >
                    Dados da Pesquisa
                </Button>
                <Button
                    type="button"
                    variant={editTab === 'extra' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditTab('extra')}
                >
                    Montagem da Pesquisa
                </Button>
            </div>

            {/* Aba 1: Formulário Atual */}
            {editTab === 'info' && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {submitError && <p className="text-sm text-red-500">{submitError}</p>}

                    <div>
                        <label className="text-sm font-medium" htmlFor={`title-${research.id}`}>
                            Título*
                        </label>
                        <Input
                            required
                            id={`title-${research.id}`}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium" htmlFor={`desc-${research.id}`}>
                            Descrição*
                        </label>
                        <Input
                            required
                            id={`desc-${research.id}`}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium" htmlFor={`obj-${research.id}`}>
                            Objetivo*
                        </label>
                        <Input
                            required
                            id={`obj-${research.id}`}
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium" htmlFor={`start-${research.id}`}>
                                Início*
                            </label>
                            <Input
                                type="date"
                                required
                                id={`start-${research.id}`}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium" htmlFor={`end-${research.id}`}>
                                Término*
                            </label>
                            <Input
                                type="date"
                                required
                                id={`end-${research.id}`}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {!datesValid && (
                        <p className="text-red-500 text-xs">
                            A data de término deve ser após a data de início.
                        </p>
                    )}

                    <div>
                        <label className="text-sm font-medium" htmlFor={`audience-${research.id}`}>
                            Público-Alvo*
                        </label>
                        <Input
                            required
                            id={`audience-${research.id}`}
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" className="verde" disabled={isLoading || !datesValid}>
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Spinner />
                                    <span>Salvando...</span>
                                </div>
                            ) : (
                                <span>Salvar Alterações</span>
                            )}
                        </Button>
                    </div>
                </form>
            )}

            {/* Aba 2: Seção futura */}
            {editTab === 'extra' && (
                <div className='w-full'>
                    <MontarPesquisaForm
                        researchId={research.id}
                        initialQuestions={research.questions} // Passa se já vier na busca da pesquisa
                        onSuccess={() => toast.success('Perguntas salvas com sucesso!')}
                    />
                </div>
            )}
        </div>
    );
}

interface TabelaPesquisasProps {
    allowActions?: boolean;
}

export default function TabelaPesquisas({ allowActions = true }: TabelaPesquisasProps) {
    const [rawResearches, setRawResearches] = useState<Research[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const columns = allowActions
        ? allResearchColumns
        : allResearchColumns.filter((col) => col.key !== 'edit' && col.key !== 'delete');

    useEffect(() => {
        getResearches()
            .then((data) => setRawResearches(data))
            .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar pesquisas'))
            .finally(() => setLoading(false));
    }, []);

    const handleUpdateSuccess = (updatedItem: Research) => {
        setRawResearches((prev) =>
            prev.map((item) => (String(item.id) === String(updatedItem.id) ? updatedItem : item))
        );
    };

    const executeDelete = async (id: string, toastId: string) => {
        toast.dismiss(toastId);
        setActionError(null);

        try {
            // Exemplo: await deleteResearch(id);

            //É AQUI ONDE VC VAI COLOCAR A FUNÇÂO DE DELETAR A PESQUISA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            
            setRawResearches((prev) => prev.filter((r) => String(r.id) !== id));
            toast.success('Pesquisa excluída com sucesso!');
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
                className="font-medium text-primary hover:underline hover:text-[#447762] transition-colors block"
            >
                {item.title}
            </Link>
        ),
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-',
        status: (
            <Badge variant={item.status === 'ACTIVE' || !item.status ? 'default' : 'secondary'}>
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
                        <FormEditarPesquisa
                            research={item}
                            onSuccess={handleUpdateSuccess}
                        />
                    }
                />
            ),
            delete: (
                <Button variant="destructive" size="sm" onClick={() => handleDelete(String(item.id))}>
                    Excluir
                </Button>
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
                <Tabela<FormattedResearch> columns={columns} data={researches} />
            )}
        </div>
    );
}