'use client'

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, getCollectionAudio, getCollections, type CollectionSummary } from "@/lib/collection";
import { FileText, Headphones, MicOff, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import RespostasColeta from "./RespostasColeta";

const formatDateTime = (value: string | null) =>
    value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

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
        return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Spinner />Carregando coletas...</div>;
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
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    {collections.length} coleta(s) · {withAudio} com gravação
                </p>
                <Badge variant={recordInterview ? 'default' : 'outline'}>
                    {recordInterview ? 'Gravação da entrevista ligada' : 'Gravação da entrevista desligada'}
                </Badge>
            </div>

            {collections.length === 0 ? (
                <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                    Nenhuma coleta recebida ainda.
                </p>
            ) : (
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Coleta</TableHead>
                                <TableHead>Pesquisador</TableHead>
                                <TableHead>Início</TableHead>
                                <TableHead>Consentimento</TableHead>
                                <TableHead>Gravação</TableHead>
                                <TableHead>Duração</TableHead>
                                <TableHead className="text-right">Respostas</TableHead>
                                <TableHead className="text-right">Áudio</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {collections.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">#{c.id}</TableCell>
                                    <TableCell>{c.researcherName ?? '-'}</TableCell>
                                    <TableCell>{formatDateTime(c.startedAt)}</TableCell>
                                    <TableCell>
                                        {c.consent.given ? (
                                            <div className="flex flex-col text-xs">
                                                <span>{formatDateTime(c.consent.at)}</span>
                                                <span className="text-muted-foreground">por {c.consent.confirmedByName ?? '-'}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {c.hasAudio ? (
                                            <Badge variant="default" className="gap-1"><Headphones className="h-3 w-3" />Gravada</Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1"><MicOff className="h-3 w-3" />Sem gravação</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{c.hasAudio ? formatDuration(c.audioDurationSeconds) : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setViewing(c)}>
                                            <FileText className="h-3 w-3" />Ver respostas
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {c.hasAudio && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={loadingAudioId === c.id}
                                                onClick={() => handleListen(c.id)}
                                            >
                                                {loadingAudioId === c.id ? <Spinner /> : 'Ouvir'}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <RespostasColeta collection={viewing} onClose={() => setViewing(null)} />

            {player && (
                <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                    <p className="text-sm font-medium">Áudio da coleta #{player.collectionId}</p>
                    <audio
                        key={player.url}
                        controls
                        autoPlay
                        preload="auto"
                        src={player.url}
                        className="w-full"
                        onError={(event) => {
                            const code = event.currentTarget.error?.code;
                            const message = (code && AUDIO_ERRORS[code]) || 'Não foi possível reproduzir o áudio.';
                            setPlayer((current) => (current ? { ...current, error: message } : current));
                        }}
                    />
                    {player.error && <p className="text-sm text-destructive">{player.error}</p>}
                    <p className="text-xs text-muted-foreground">
                        Arquivo de {formatSize(player.sizeBytes)} ·{' '}
                        <a href={player.url} download={`coleta-${player.collectionId}.m4a`} className="underline">
                            Baixar áudio
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
}
