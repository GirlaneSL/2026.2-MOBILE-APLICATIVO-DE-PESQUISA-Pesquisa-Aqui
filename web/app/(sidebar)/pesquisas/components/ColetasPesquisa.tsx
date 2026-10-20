'use client'

import { Contour } from "@/components/ui/contour";
import { Spinner } from "@/components/ui/spinner";
import { LoadingState } from "@/components/ui/loadingState";
import { formatDuration, getCollectionAudio, getCollections, type CollectionSummary } from "@/lib/collection";
import { Clock, FileText, Headphones, Mic, MicOff, Play, Search, SearchX, ShieldAlert, ShieldCheck, Inbox, Users, X } from "lucide-react";
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

const dayKey = (value: string | null) =>
    value ? new Date(value).toLocaleDateString('pt-BR') : 'Sem data';

const dayLabel = (value: string | null) =>
    value
        ? new Date(value).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'Sem data';

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
}

type ListState =
    | { status: 'loading' }
    | { status: 'forbidden'; message: string }
    | { status: 'error'; message: string }
    | { status: 'ready'; collections: CollectionSummary[] };

export default function ColetasPesquisa({ researchId, recordInterview }: ColetasPesquisaProps) {
    const [state, setState] = useState<ListState>({ status: 'loading' });
    const [loadingAudioId, setLoadingAudioId] = useState<number | null>(null);
    const [viewing, setViewing] = useState<CollectionSummary | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('ALL');
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
                if (!cancelled) setState({ status: 'ready', collections });
            })
            .catch((err) => {
                if (cancelled) return;
                const status = (err as { status?: number })?.status;
                const message = err instanceof Error ? err.message : 'Erro ao carregar as coletas';
                setState(status === 403 ? { status: 'forbidden', message } : { status: 'error', message });
            });

        return () => { cancelled = true; };
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

    const groups = useMemo(() => {
        const term = normalize(search.trim());
        const list = collections
            .filter((c) => {
                if (filter === 'AUDIO' && !c.hasAudio) return false;
                if (filter === 'NO_AUDIO' && c.hasAudio) return false;
                return !term || normalize(c.researcherName ?? '').includes(term) || String(c.id).includes(term.replace('#', ''));
            })
            .sort((a, b) => timeOf(b.startedAt) - timeOf(a.startedAt));

        const map = new Map<string, { label: string; items: CollectionSummary[] }>();
        list.forEach((c) => {
            const key = dayKey(c.startedAt);
            if (!map.has(key)) map.set(key, { label: dayLabel(c.startedAt), items: [] });
            map.get(key)!.items.push(c);
        });
        return [...map.values()];
    }, [collections, search, filter]);

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

            {/* Ferramentas */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {filters.map((f) => {
                        const on = f.value === filter;
                        return (
                            <button
                                key={f.value}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setFilter(f.value)}
                                className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors ${
                                    on ? 'border-ink bg-ink text-white' : 'border-border bg-white text-muted-foreground hover:border-[#c6d0c9] hover:text-ink'
                                }`}
                            >
                                {f.label}
                                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${on ? 'bg-white/15 text-[var(--mint)]' : 'bg-[#ebeeeb]'}`}>
                                    {f.count}
                                </span>
                            </button>
                        );
                    })}
                    <span
                        className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ${
                            recordInterview ? 'bg-[#f3e0d9] text-[#8a432f]' : 'bg-[#ebeeeb] text-muted-foreground'
                        }`}
                    >
                        {recordInterview ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
                        Gravação {recordInterview ? 'ligada' : 'desligada'}
                    </span>
                </div>

                <div className="relative w-full lg:max-w-xs">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Buscar coletas"
                        placeholder="Buscar pesquisador ou nº da coleta..."
                        className="h-10 w-full rounded-full border border-input bg-white pl-10 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
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

            {/* Lista agrupada por dia */}
            {collections.length === 0 ? (
                <div className="relative overflow-hidden rounded-[26px] border border-dashed border-input bg-muted/40 px-6 py-14 text-center">
                    <Contour seed={2} rings={10} cx={0.5} cy={0.5} size={1.2} style={{ opacity: 0.3 }} />
                    <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="grid size-14 place-items-center rounded-2xl bg-white text-[var(--green-deep)] ring-1 ring-border"><Inbox className="size-6" /></div>
                        <p className="text-base font-semibold tracking-tight">Nenhuma coleta recebida ainda</p>
                        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                            Assim que os pesquisadores enviarem coletas pelo aplicativo, elas aparecem aqui.
                        </p>
                    </div>
                </div>
            ) : groups.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-[22px] border border-dashed border-input bg-muted/40 px-6 py-10 text-center">
                    <div className="grid size-12 place-items-center rounded-2xl bg-white text-[var(--green-deep)] ring-1 ring-border"><SearchX className="size-5" /></div>
                    <p className="text-sm font-semibold">Nenhuma coleta encontrada</p>
                    <button
                        type="button"
                        onClick={() => { setSearch(''); setFilter('ALL'); }}
                        className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3.5 text-[13px] font-medium hover:bg-muted"
                    >
                        <X className="size-3.5" /> Limpar filtros
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {groups.map((g) => (
                        <section key={g.label}>
                            <h4 className="mb-2.5 flex items-center gap-3 px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                <span className="first-letter:uppercase">{g.label}</span>
                                <span className="h-px flex-1 bg-border" />
                                <span className="rounded-full bg-[#ebeeeb] px-2 py-0.5 text-[11px] normal-case tracking-normal">{g.items.length}</span>
                            </h4>

                            <ul className="flex flex-col gap-2.5">
                                {g.items.map((c) => (
                                    <li
                                        key={c.id}
                                        className="group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[20px] border border-border bg-white p-3 pr-4 transition-all hover:-translate-y-px hover:border-[#c6d0c9] hover:shadow-[0_16px_28px_-22px_rgba(10,20,16,0.5)]"
                                    >
                                        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--forest)] text-[15px] font-semibold tracking-tight text-[var(--mint)]">
                                            #{c.id}
                                        </span>

                                        <div className="flex min-w-0 flex-1 basis-52 items-center gap-3">
                                            <div className={`avatar-pa size-10 text-[13px] ${toneOfName(c.researcherName)}`} aria-hidden="true">
                                                {initialsOf(c.researcherName)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-[15px] font-semibold tracking-tight">{c.researcherName ?? '-'}</p>
                                                <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                                                    <Clock className="size-3.5" /> {formatTime(c.startedAt)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {c.consent.given ? (
                                                <span
                                                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#e4ece7] px-2.5 text-xs font-medium text-[var(--green-deep)]"
                                                    title={`Consentimento em ${formatTime(c.consent.at)} por ${c.consent.confirmedByName ?? '-'}`}
                                                >
                                                    <ShieldCheck className="size-3.5" />
                                                    Consentiu · {formatTime(c.consent.at)}
                                                </span>
                                            ) : (
                                                <span className="inline-flex h-7 items-center rounded-full bg-[#ebeeeb] px-2.5 text-xs font-medium text-muted-foreground">
                                                    Sem consentimento
                                                </span>
                                            )}

                                            {c.hasAudio ? (
                                                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#f3e0d9] px-2.5 text-xs font-medium text-[#8a432f]">
                                                    <Headphones className="size-3.5" />
                                                    Gravada · {formatDuration(c.audioDurationSeconds)}
                                                </span>
                                            ) : (
                                                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#ebeeeb] px-2.5 text-xs font-medium text-muted-foreground">
                                                    <MicOff className="size-3.5" />
                                                    Sem gravação
                                                </span>
                                            )}
                                        </div>

                                        <div className="ml-auto flex items-center gap-2">
                                            {c.hasAudio && (
                                                <button
                                                    type="button"
                                                    disabled={loadingAudioId === c.id}
                                                    onClick={() => onListen(c.id)}
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-white px-4 text-[13px] font-semibold transition-colors hover:border-[#e8c4b8] hover:bg-[#f3e0d9] hover:text-[#8a432f] disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {loadingAudioId === c.id ? <Spinner className="size-3.5" /> : <Play className="size-3.5" />}
                                                    Ouvir
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => onView(c)}
                                                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#26332c]"
                                            >
                                                <FileText className="size-3.5" /> Ver respostas
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}

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
