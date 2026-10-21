'use client'

import { Button } from "@/components/ui/button";
import { Contour } from "@/components/ui/contour";
import {
    CellTitle,
    DataTable,
    DataTableHeader,
    DataTableToolbar,
    RowActions,
    TableChip,
    TableEmpty,
    TableFilters,
    TableSearch,
    TableViewControls,
    sortRows,
    type DataColumn,
    type TableSort,
    type TableView,
} from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { LoadingState } from "@/components/ui/loadingState";
import { formatDuration, getCollectionAudio, getCollections, type CollectionSummary } from "@/lib/collection";
import { Clock, FileText, Headphones, Play, ShieldAlert, Inbox, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import RespostasColeta from "./RespostasColeta";

type Filter = 'ALL' | 'AUDIO' | 'NO_AUDIO';

const TONES = [
    'bg-[#cfe3d8] text-[#1f3a2f]',
    'bg-[#f0d5cb] text-[#7a3b29]',
    'bg-[#dfe6ef] text-[#2a3d57]',
    'bg-[#e6e0cc] text-[#5b4d1c]',
];

const toneOfName = (name?: string | null) =>
    TONES[[...(name ?? '?')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TONES.length];

const initialsOf = (name?: string | null) =>
    (name ?? '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || '?';

const normalize = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const timeOf = (value: string | null) => (value ? new Date(value).getTime() : 0) || 0;

const formatTime = (value: string | null) =>
    value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';

const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// Códigos de erro do elemento <audio> (MediaError.code)
const AUDIO_ERRORS: Record<number, string> = {
    1: 'O carregamento do áudio foi interrompido.',
    2: 'Falha de rede ao carregar o áudio.',
    3: 'O navegador não conseguiu decodificar o áudio: o arquivo pode estar incompleto ou corrompido.',
    4: 'O navegador não reconhece o formato deste áudio.',
};

interface ColetasPesquisaProps {
    researchId: number;
    recordInterview: boolean;
    /** Abre esta coleta assim que a lista carregar (vem do buscador global). */
    openCollectionId?: number;
}

type ListState =
    | { status: 'loading' }
    | { status: 'forbidden'; message: string }
    | { status: 'error'; message: string }
    | { status: 'ready'; collections: CollectionSummary[] };

export default function ColetasPesquisa({ researchId, recordInterview, openCollectionId }: ColetasPesquisaProps) {
    const [state, setState] = useState<ListState>({ status: 'loading' });
    const [loadingAudioId, setLoadingAudioId] = useState<number | null>(null);
    const [viewing, setViewing] = useState<CollectionSummary | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('ALL');
    const [sort, setSort] = useState<TableSort>('recent');
    const [view, setView] = useState<TableView>('table');
    const [now] = useState(() => Date.now());
    const [player, setPlayer] = useState<{
        collectionId: number;
        url: string;
        sizeBytes: number;
        error: string | null;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;

        getCollections(researchId)
            .then((collections) => {
                if (cancelled) return;
                setState({ status: 'ready', collections });
                const target = openCollectionId === undefined ? undefined : collections.find((c) => c.id === openCollectionId);
                if (target) setViewing(target);
            })
            .catch((err) => {
                if (cancelled) return;
                const status = (err as { status?: number })?.status;
                const message = err instanceof Error ? err.message : 'Erro ao carregar as coletas';
                setState(status === 403 ? { status: 'forbidden', message } : { status: 'error', message });
            });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a coleta pedida só vale na primeira carga
    }, [researchId]);

    // Libera o arquivo em memória quando o player troca ou a tela fecha.
    useEffect(() => {
        return () => { if (player) URL.revokeObjectURL(player.url); };
    }, [player]);

    const handleListen = async (collectionId: number) => {
        setLoadingAudioId(collectionId);
        try {
            const blob = await getCollectionAudio(collectionId);
            setPlayer({ collectionId, url: URL.createObjectURL(blob), sizeBytes: blob.size, error: null });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao carregar o áudio');
        } finally {
            setLoadingAudioId(null);
        }
    };

    if (state.status === 'loading') {
        return <LoadingState label="Carregando coletas..." shape="collections" />;
    }

    if (state.status === 'forbidden') {
        return (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <ShieldAlert className="h-8 w-8 text-destructive" />
                <p className="max-w-md text-sm">{state.message}</p>
            </div>
        );
    }

    if (state.status === 'error') {
        return (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-medium">Erro ao carregar as coletas</p>
                <p>{state.message}</p>
            </div>
        );
    }

    const { collections } = state;
    const withAudio = collections.filter((c) => c.hasAudio).length;

    return (
        <ColetasView
            collections={collections}
            withAudio={withAudio}
            recordInterview={recordInterview}
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            now={now}
            loadingAudioId={loadingAudioId}
            onListen={handleListen}
            onView={setViewing}
            viewing={viewing}
            onCloseView={() => setViewing(null)}
            player={player}
            onPlayerError={(message) => setPlayer((current) => (current ? { ...current, error: message } : current))}
        />
    );
}

type Player = { collectionId: number; url: string; sizeBytes: number; error: string | null } | null;

interface ColetasViewProps {
    collections: CollectionSummary[];
    withAudio: number;
    recordInterview: boolean;
    search: string;
    setSearch: (v: string) => void;
    filter: Filter;
    setFilter: (f: Filter) => void;
    now: number;
    loadingAudioId: number | null;
    onListen: (id: number) => void;
    onView: (c: CollectionSummary) => void;
    viewing: CollectionSummary | null;
    onCloseView: () => void;
    player: Player;
    onPlayerError: (message: string) => void;
}

function ColetasView({
    collections, withAudio, recordInterview, search, setSearch, filter, setFilter, now,
    loadingAudioId, onListen, onView, viewing, onCloseView, player, onPlayerError,
}: ColetasViewProps) {
    const researchersCount = new Set(collections.map((c) => c.researcherName).filter(Boolean)).size;
    const last = collections.reduce((max, c) => Math.max(max, timeOf(c.startedAt)), 0);
    const lastDays = last ? Math.max(0, Math.floor((now - last) / 86400000)) : null;
    const lastText =
        lastDays === null ? '—' : lastDays === 0 ? 'Hoje' : lastDays === 1 ? 'Ontem' : `${lastDays} dias`;

    const rows = useMemo(() => {
        const term = normalize(search.trim());
        return sortRows(
            collections.filter((c) => {
                if (filter === 'AUDIO' && !c.hasAudio) return false;
                if (filter === 'NO_AUDIO' && c.hasAudio) return false;
                return !term || normalize(c.researcherName ?? '').includes(term) || String(c.id).includes(term.replace('#', ''));
            }),
            sort,
            { name: (c) => c.researcherName, date: (c) => timeOf(c.startedAt) }
        );
    }, [collections, search, filter, sort]);

    const columns: DataColumn<CollectionSummary>[] = [
        {
            id: 'id',
            header: 'Coleta',
            cell: (c) => <CellTitle title={`#${c.id}`} />,
        },
        {
            id: 'researcher',
            header: 'Pesquisador',
            minWidth: '12rem',
            cell: (c) => (
                <div className="pa-dt-person">
                    <span className={`avatar-pa pa-dt-av ${toneOfName(c.researcherName)}`} aria-hidden="true">
                        {initialsOf(c.researcherName)}
                    </span>
                    <div className="tx"><b>{c.researcherName ?? '-'}</b></div>
                </div>
            ),
        },
        {
            id: 'when',
            header: 'Iniciada em',
            cell: (c) => (
                <div>
                    {c.startedAt ? new Date(c.startedAt).toLocaleDateString('pt-BR') : '-'}
                    <small>{formatTime(c.startedAt)}</small>
                </div>
            ),
        },
        {
            id: 'consent',
            header: 'Consentimento',
            cell: (c) =>
                c.consent.given ? (
                    <TableChip
                        tone="live"
                        title={`Consentimento em ${formatTime(c.consent.at)} por ${c.consent.confirmedByName ?? '-'}`}
                    >
                        Consentiu · {formatTime(c.consent.at)}
                    </TableChip>
                ) : (
                    <TableChip tone="done">Sem consentimento</TableChip>
                ),
        },
        {
            id: 'audio',
            header: 'Gravação',
            cell: (c) =>
                c.hasAudio ? (
                    <TableChip tone="soon">Gravada · {formatDuration(c.audioDurationSeconds)}</TableChip>
                ) : (
                    <TableChip tone="done">Sem gravação</TableChip>
                ),
        },
        {
            id: 'actions',
            header: 'Ações',
            hideHeader: true,
            align: 'right',
            cell: (c) => (
                <RowActions>
                    {c.hasAudio && (
                        <Button variant="outline" size="sm" disabled={loadingAudioId === c.id} onClick={() => onListen(c.id)}>
                            {loadingAudioId === c.id ? <Spinner className="size-3.5" /> : <Play />}
                            Ouvir
                        </Button>
                    )}
                    <Button size="sm" onClick={() => onView(c)}>
                        <FileText /> Ver respostas
                    </Button>
                </RowActions>
            ),
        },
    ];

    const filters: { value: Filter; label: string; count: number }[] = [
        { value: 'ALL', label: 'Todas', count: collections.length },
        { value: 'AUDIO', label: 'Com gravação', count: withAudio },
        { value: 'NO_AUDIO', label: 'Sem gravação', count: collections.length - withAudio },
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* Indicadores */}
            <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <article className="pa-card dark introduction-card !p-5">
                    <Contour seed={3} rings={9} cx={0.9} cy={0.2} size={0.8} />
                    <p className="flex items-center gap-2 text-xs font-medium text-[var(--muted-dark)]"><Inbox className="size-3.5" /> Coletas recebidas</p>
                    <p className="pa-stat mt-3 text-[var(--fg-dark)]">{collections.length}</p>
                </article>
                <article className="pa-card mint introduction-card !p-5" style={{ animationDelay: '100ms' }}>
                    <p className="flex items-center gap-2 text-xs font-medium text-[var(--green-deep)]"><Headphones className="size-3.5" /> Com gravação</p>
                    <p className="pa-stat mt-3">{withAudio}</p>
                </article>
                <article className="pa-card introduction-card !p-5" style={{ animationDelay: '200ms' }}>
                    <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Users className="size-3.5" /> Pesquisadores ativos</p>
                    <p className="pa-stat mt-3">{researchersCount}</p>
                </article>
                <article className="pa-card introduction-card !p-5" style={{ animationDelay: '300ms' }}>
                    <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Clock className="size-3.5" /> Última coleta</p>
                    <p className="pa-stat mt-3">{lastText}</p>
                </article>
            </section>

            {/* Tabela de coletas */}
            <div>
                <DataTableHeader
                    title="Coletas recebidas"
                    count={rows.length === collections.length ? collections.length : `${rows.length} de ${collections.length}`}
                />

                {collections.length > 0 && (
                    <DataTableToolbar>
                        <TableSearch
                            value={search}
                            onChange={setSearch}
                            placeholder="Buscar pesquisador ou nº da coleta..."
                            label="Buscar coletas"
                        />
                        <div className="grow flex flex-wrap items-center gap-2">
                            <TableFilters<Filter> label="Gravação" value={filter} onChange={setFilter} options={filters} />
                            <TableChip tone={recordInterview ? 'soon' : 'done'}>
                                Gravação {recordInterview ? 'ligada' : 'desligada'}
                            </TableChip>
                            <TableViewControls sort={sort} onSortChange={setSort} view={view} onViewChange={setView} />
                        </div>
                    </DataTableToolbar>
                )}

                <DataTable
                    label="Coletas recebidas"
                    columns={columns}
                    rows={rows}
                    getRowKey={(c) => c.id}
                    minWidth="860px"
                    view={view}
                    empty={
                        collections.length === 0 ? (
                            <TableEmpty
                                icon={<Inbox />}
                                title="Nenhuma coleta recebida ainda"
                                text="Assim que os pesquisadores enviarem coletas pelo aplicativo, elas aparecem aqui."
                            />
                        ) : (
                            <TableEmpty
                                title="Nenhuma coleta encontrada"
                                text="Tente outro nome ou número."
                                onClear={() => { setSearch(''); setFilter('ALL'); }}
                            />
                        )
                    }
                />
            </div>

            <RespostasColeta collection={viewing} onClose={onCloseView} />

            {player && (
                <div className="pa-card dark introduction-card !p-5">
                    <Contour seed={9} rings={8} cx={0.92} cy={0.5} size={0.8} />
                    <div className="flex items-center gap-3">
                        <div className="pa-ic"><Headphones /></div>
                        <div>
                            <h3 className="!text-base">Áudio da coleta #{player.collectionId}</h3>
                            <p className="desc">
                                Arquivo de {formatSize(player.sizeBytes)} ·{' '}
                                <a href={player.url} download={`coleta-${player.collectionId}.m4a`} className="underline">
                                    Baixar áudio
                                </a>
                            </p>
                        </div>
                    </div>
                    <audio
                        key={player.url}
                        controls
                        autoPlay
                        preload="auto"
                        src={player.url}
                        className="mt-4 w-full"
                        onError={(event) => {
                            const code = event.currentTarget.error?.code;
                            onPlayerError((code && AUDIO_ERRORS[code]) || 'Não foi possível reproduzir o áudio.');
                        }}
                    />
                    {player.error && <p className="mt-2 text-sm text-[#f0b09c]">{player.error}</p>}
                </div>
            )}
        </div>
    );
}
