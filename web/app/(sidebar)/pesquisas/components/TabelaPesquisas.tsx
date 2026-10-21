'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    CellTitle,
    DataTable,
    DataTableHeader,
    DataTableToolbar,
    RowActions,
    TableChip,
    TableEmpty,
    TableSearch,
    sortRows,
    type DataColumn,
} from '@/components/ui/data-table';
import { formatPeriod } from '@/lib/fieldData';
import { deleteResearch, getResearches, publishResearch, type Research as ApiResearch } from '@/lib/research';
import { situationOf } from '../../(home)/components/PesquisasEquipeTabela';
import DialogLayout from '@/components/ui/dialogLayout';
import ModalEditarPesquisa from './ModalEditarPesquisa';
import toast from 'react-hot-toast';
import { isSessionExpiredError } from '@/lib/apiFetcher';

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

const CHIP_TONE = { light: 'live', clay: 'soon', gray: 'done' } as const;

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Ordem da tabela: Recentes, A-Z ou Prazo (quem encerra primeiro). Vem dos botões da página. */
export type PesquisaSort = 'recent' | 'name' | 'deadline';

interface TabelaPesquisasProps {
    sort?: PesquisaSort;
    allowActions?: boolean;
    refreshTrigger?: number;
    onChange?: () => void;
}

export default function TabelaPesquisas({ sort = 'recent', allowActions = true, refreshTrigger = 0, onChange }: TabelaPesquisasProps) {
    const [rawResearches, setRawResearches] = useState<Research[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [now] = useState(() => Date.now());

    useEffect(() => {
        setLoading(true);
        getResearches()
            .then((data) => setRawResearches(data))
            .catch((err) => {
                if (isSessionExpiredError(err)) return;
                setError(err instanceof Error ? err.message : 'Erro ao carregar pesquisas');
            })
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

    const executePublish = async (id: string, toastId: string) => {
        toast.dismiss(toastId);
        setActionError(null);

        try {
            const updated = await publishResearch(+id);
            setRawResearches((prev) =>
                prev.map((r) => (String(r.id) === id ? { ...r, status: updated.status } : r))
            );
            toast.success('Pesquisa publicada com sucesso!');

            if (onChange) {
                onChange();
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Erro ao publicar pesquisa';
            setActionError(errorMsg);
            toast.error(errorMsg);
        }
    };

    const handlePublish = (id: string) => {
        const item = rawResearches.find((r) => String(r.id) === id);

        toast(
            (t) => (
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">
                        Publicar &quot;{item?.title ?? id}&quot;? Depois de publicada, a pesquisa não pode mais ser excluída.
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
                            variant="default"
                            size="sm"
                            onClick={() => executePublish(id, t.id)}
                        >
                            Publicar
                        </Button>
                    </div>
                </div>
            ),
            {
                duration: 6000,
                id: `publish-${id}`,
            }
        );
    };

    const term = normalize(search.trim());
    const researches = useMemo(() => {
        const matching = term
            ? rawResearches.filter((r) => normalize(`${r.title} ${r.objective ?? ''} ${r.targetAudience ?? ''}`).includes(term))
            : rawResearches;

        if (sort === 'deadline') {
            const endsAt = (r: Research) => (r.endDate ? new Date(r.endDate).getTime() : Infinity);
            return [...matching].sort((a, b) => endsAt(a) - endsAt(b));
        }
        return sortRows(matching, sort, { name: (r) => r.title, date: (r) => r.createdAt });
    }, [rawResearches, term, sort]);

    const columns: DataColumn<Research>[] = [
        {
            id: 'title',
            header: 'Pesquisa',
            minWidth: '14rem',
            cell: (item) => (
                <CellTitle
                    title={item.title}
                    href={`/pesquisas/${item.id}`}
                    sub={item.createdAt ? `Criada em ${new Date(item.createdAt).toLocaleDateString('pt-BR')}` : undefined}
                />
            ),
        },
        {
            id: 'period',
            header: 'Período',
            cell: (item) => formatPeriod(item.startDate, item.endDate, new Date(now)),
        },
        {
            id: 'status',
            header: 'Situação',
            cell: (item) => {
                const situation = situationOf(item as unknown as ApiResearch, now);
                return <TableChip tone={CHIP_TONE[situation.tone]}>{situation.label}</TableChip>;
            },
        },
        ...(allowActions
            ? [{
                id: 'actions',
                header: 'Ações',
                hideHeader: true,
                align: 'right',
                cell: (item: Research) => (
                    <RowActions>
                        {item.status === 'DRAFT' ? (
                            <DialogLayout
                                dialogTitle={`Editar: ${item.title}`}
                                dialogTrigger="Editar"
                                triggerButtonVariant="outline"
                                triggerButtonSize="sm"
                                dialogDescription="Atualize as informações da pesquisa abaixo."
                                dialogContentClassName={"min-h-200"}
                                dialogContent={<ModalEditarPesquisa research={item} onSuccess={handleUpdateSuccess} />}
                            />
                        ) : (
                            <Button variant="outline" size="sm" disabled title="Pesquisa publicada: não pode mais ser editada">Editar</Button>
                        )}
                        <Button
                            variant="default"
                            size="sm"
                            disabled={item.status !== 'DRAFT'}
                            onClick={() => handlePublish(String(item.id))}
                        >
                            Publicar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={item.status !== 'DRAFT'}
                            onClick={() => handleDelete(String(item.id))}
                        >
                            Excluir
                        </Button>
                    </RowActions>
                ),
            } as DataColumn<Research>]
            : []),
    ];

    return (
        <div className="flex flex-col">
            <DataTableHeader title="Pesquisas cadastradas" count={term ? `${researches.length} de ${rawResearches.length}` : rawResearches.length} />

            {!loading && rawResearches.length > 0 && (
                <DataTableToolbar>
                    <TableSearch value={search} onChange={setSearch} placeholder="Buscar por título ou público..." label="Buscar pesquisas" />
                </DataTableToolbar>
            )}

            {error && <p className="mb-3 text-sm text-destructive">Erro: {error}</p>}
            {actionError && <p className="mb-3 text-sm text-destructive">{actionError}</p>}

            <DataTable
                label="Pesquisas cadastradas"
                columns={columns}
                rows={researches}
                getRowKey={(item) => item.id}
                loading={loading}
                loadingLabel="Carregando pesquisas..."
                minWidth={allowActions ? '820px' : '640px'}
                empty={
                    rawResearches.length === 0 ? (
                        <TableEmpty title="Nenhuma pesquisa encontrada." />
                    ) : (
                        <TableEmpty title="Nenhuma pesquisa encontrada" text="Tente outro título ou público." onClear={() => setSearch('')} />
                    )
                }
            />
        </div>
    );
}
