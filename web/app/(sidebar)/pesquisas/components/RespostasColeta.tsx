'use client'

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
    formatAnswer,
    getCollection,
    type CollectionDetail,
    type CollectionQuestion,
    type CollectionSummary,
    type FormattedAnswer,
} from "@/lib/collection";
import { useEffect, useState } from "react";

const formatDateTime = (value: string | null) =>
    value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

const mapUrl = (latitude: number, longitude: number) =>
    `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;

function AnswerView({ answer }: { answer: FormattedAnswer }) {
    switch (answer.kind) {
        case 'empty':
            return <p className="text-sm italic text-muted-foreground">Sem resposta</p>;

        case 'text':
            return <p className="whitespace-pre-wrap break-words text-sm">{answer.text}</p>;

        case 'list':
            return (
                <ul className="list-disc pl-5 text-sm">
                    {answer.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
            );

        case 'scale':
            return (
                <div className="flex flex-col gap-0.5 text-sm">
                    <p>{answer.value} de 5</p>
                    {(answer.leftLabel || answer.rightLabel) && (
                        <p className="text-xs text-muted-foreground">
                            1 = {answer.leftLabel ?? '-'} · 5 = {answer.rightLabel ?? '-'}
                        </p>
                    )}
                </div>
            );

        case 'location':
            return (
                <div className="flex flex-col gap-1 text-sm">
                    <p>
                        {answer.latitude.toFixed(6)}, {answer.longitude.toFixed(6)}
                        {answer.accuracy !== null && (
                            <span className="text-muted-foreground"> · precisão de ±{Math.round(answer.accuracy)} m</span>
                        )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href={mapUrl(answer.latitude, answer.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline"
                        >
                            Abrir no mapa
                        </a>
                        {answer.lowAccuracy && <Badge variant="outline">Baixa precisão</Badge>}
                    </div>
                </div>
            );

        case 'file':
            return (
                <div className="flex flex-col gap-0.5 text-sm">
                    {answer.names.map((name) => <p key={name} className="break-all">{name}</p>)}
                    <p className="text-xs text-muted-foreground">
                        Só o nome do arquivo é enviado pelo aplicativo; a mídia desta pergunta não fica disponível aqui.
                    </p>
                </div>
            );
    }
}

function QuestionItem({ number, question }: { number: number; question: CollectionQuestion }) {
    return (
        <li className="flex flex-col gap-1 rounded-lg border bg-card p-3">
            <p className="text-sm font-medium">
                {number}. {question.statement}
                {question.isRequired && <span className="text-destructive" title="Obrigatória"> *</span>}
            </p>
            <AnswerView answer={formatAnswer(question)} />
        </li>
    );
}

type DetailState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; detail: CollectionDetail };

function RespostasConteudo({ collectionId }: { collectionId: number }) {
    const [state, setState] = useState<DetailState>({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;

        getCollection(collectionId)
            .then((detail) => { if (!cancelled) setState({ status: 'ready', detail }); })
            .catch((err) => {
                if (!cancelled) {
                    setState({ status: 'error', message: err instanceof Error ? err.message : 'Erro ao carregar as respostas' });
                }
            });

        return () => { cancelled = true; };
    }, [collectionId]);

    if (state.status === 'loading') {
        return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Spinner />Carregando respostas...</div>;
    }

    if (state.status === 'error') {
        return (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-medium">Erro ao carregar as respostas</p>
                <p>{state.message}</p>
            </div>
        );
    }

    const { sections } = state.detail;
    const questions = sections.flatMap((section) => section.questions);
    const answered = questions.filter((question) => formatAnswer(question).kind !== 'empty').length;

    if (questions.length === 0) {
        return <p className="p-4 text-center text-sm text-muted-foreground">Esta pesquisa não tem perguntas.</p>;
    }

    // Numeração corrida do questionário, sem mutar variável durante a renderização.
    const numbered = sections
        .filter((section) => section.questions.length > 0)
        .map((section, index, visible) => ({
            section,
            firstNumber: 1 + visible.slice(0, index).reduce((total, previous) => total + previous.questions.length, 0),
        }));

    return (
        <div className="flex flex-col gap-5">
            <p className="text-sm text-muted-foreground">{answered} de {questions.length} pergunta(s) respondida(s)</p>
            {numbered.map(({ section, firstNumber }) => (
                <section key={section.id} className="flex flex-col gap-2">
                    <h3 className="text-base font-semibold">{section.title}</h3>
                    <ul className="flex flex-col gap-2">
                        {section.questions.map((question, index) => (
                            <QuestionItem key={question.id} number={firstNumber + index} question={question} />
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

interface RespostasColetaProps {
    collection: CollectionSummary | null;
    onClose: () => void;
}

export default function RespostasColeta({ collection, onClose }: RespostasColetaProps) {
    return (
        <Dialog open={collection !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] w-[95vw] flex-col overflow-hidden p-5 sm:max-w-3xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="text-2xl">Respostas da coleta #{collection?.id}</DialogTitle>
                    <DialogDescription>
                        {collection?.researcherName ?? '-'} · início em {formatDateTime(collection?.startedAt ?? null)} · fim em{' '}
                        {formatDateTime(collection?.finishedAt ?? null)}
                    </DialogDescription>
                </DialogHeader>

                <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                    {collection && <RespostasConteudo key={collection.id} collectionId={collection.id} />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
