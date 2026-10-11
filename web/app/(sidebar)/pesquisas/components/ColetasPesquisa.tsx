'use client'

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    formatDuration,
    getCollectionAudio,
    getCollectionFileBlob,
    getCollectionFiles,
    getCollections,
    type CollectionFilesDetail,
    type CollectionSummary,
} from "@/lib/collection";
import { Headphones, MicOff, Paperclip, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const formatDateTime = (value: string | null) =>
    value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

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
    const [player, setPlayer] = useState<{ collectionId: number; url: string } | null>(null);

    // Arquivos da coleta aberta: lista, e endereço local de cada foto ('' = falhou ao carregar)
    const [loadingFilesId, setLoadingFilesId] = useState<number | null>(null);
    const [detail, setDetail] = useState<CollectionFilesDetail | null>(null);
    const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({});
    const photoObjectUrls = useRef<string[]>([]);
    const openToken = useRef(0);

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

    const revokePhotos = () => {
        photoObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        photoObjectUrls.current = [];
        setPhotoUrls({});
    };

    // Libera as fotos em memória ao sair da tela.
    useEffect(() => {
        return () => {
            photoObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
            photoObjectUrls.current = [];
        };
    }, []);

    const handleListen = async (collectionId: number) => {
        setLoadingAudioId(collectionId);
        try {
            const blob = await getCollectionAudio(collectionId);
            setPlayer({ collectionId, url: URL.createObjectURL(blob) });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao carregar o áudio');
        } finally {
            setLoadingAudioId(null);
        }
    };

    const closeFiles = () => {
        openToken.current += 1;
        revokePhotos();
        setDetail(null);
    };

    const handleOpenFiles = async (collectionId: number) => {
        const token = ++openToken.current;
        revokePhotos();
        setDetail(null);
        setLoadingFilesId(collectionId);

        try {
            const data = await getCollectionFiles(collectionId);
            if (token !== openToken.current) return;
            setDetail(data);
            setLoadingFilesId(null);

            // As fotos descem uma a uma, pela API autenticada
            for (const file of data.files) {
                if (file.kind !== 'PHOTO' || !file.received || file.fileId === null) continue;
                const fileId = file.fileId;
                try {
                    const blob = await getCollectionFileBlob(collectionId, fileId);
                    if (token !== openToken.current) return;
                    const url = URL.createObjectURL(blob);
                    photoObjectUrls.current.push(url);
                    setPhotoUrls((prev) => ({ ...prev, [fileId]: url }));
                } catch {
                    if (token !== openToken.current) return;
                    setPhotoUrls((prev) => ({ ...prev, [fileId]: '' }));
                }
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao carregar os arquivos');
        } finally {
            if (token === openToken.current) setLoadingFilesId(null);
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
    const withMissing = collections.filter((c) => c.files.missing > 0).length;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    {collections.length} coleta(s) · {withAudio} com gravação · {withMissing} com arquivos pendentes
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
                                <TableHead>Arquivos</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
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
                                    <TableCell>
                                        {c.files.expected === 0 ? (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        ) : c.files.missing === 0 ? (
                                            <Badge variant="default">{c.files.received}/{c.files.expected} completo</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-destructive">
                                                {c.files.received}/{c.files.expected} · faltam {c.files.missing}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {c.files.expected > 0 && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={loadingFilesId === c.id}
                                                    onClick={() => handleOpenFiles(c.id)}
                                                >
                                                    {loadingFilesId === c.id ? <Spinner /> : <><Paperclip className="mr-1 h-3 w-3" />Arquivos</>}
                                                </Button>
                                            )}
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
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {player && (
                <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                    <p className="text-sm font-medium">Áudio da coleta #{player.collectionId}</p>
                    <audio key={player.url} controls autoPlay src={player.url} className="w-full" />
                </div>
            )}

            {detail && (
                <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                            Arquivos da coleta #{detail.collectionId} · {detail.received}/{detail.expected} recebidos
                        </p>
                        <Button size="sm" variant="ghost" onClick={closeFiles}>Fechar</Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {detail.files.filter((f) => f.kind === 'PHOTO').map((f) => (
                            <div key={`${f.questionId}-${f.fileName}`} className="flex flex-col gap-1">
                                {!f.received ? (
                                    <div className="flex aspect-square items-center justify-center rounded-md border border-dashed p-2 text-center text-xs text-destructive">
                                        Aguardando envio
                                    </div>
                                ) : f.fileId !== null && photoUrls[f.fileId] ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={photoUrls[f.fileId]}
                                        alt={`Foto da questão ${f.questionId}`}
                                        className="aspect-square w-full rounded-md border object-cover"
                                    />
                                ) : f.fileId !== null && photoUrls[f.fileId] === '' ? (
                                    <div className="flex aspect-square items-center justify-center rounded-md border p-2 text-center text-xs text-muted-foreground">
                                        Não foi possível carregar a foto
                                    </div>
                                ) : (
                                    <div className="flex aspect-square items-center justify-center rounded-md border"><Spinner /></div>
                                )}
                                <span className="text-xs text-muted-foreground">Questão #{f.questionId}</span>
                            </div>
                        ))}
                    </div>

                    {detail.files.filter((f) => f.kind === 'AUDIO').map((f) => (
                        <p key="audio" className="text-sm">
                            Áudio da entrevista:{' '}
                            {f.received ? (
                                <span className="text-muted-foreground">recebido (use &quot;Ouvir&quot; na tabela)</span>
                            ) : (
                                <span className="text-destructive">aguardando envio</span>
                            )}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
