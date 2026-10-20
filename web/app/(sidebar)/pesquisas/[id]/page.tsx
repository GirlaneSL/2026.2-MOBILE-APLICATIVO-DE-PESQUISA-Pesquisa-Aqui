'use client'

import { Contour } from "@/components/ui/contour";
import { Button } from "@/components/ui/button";
import DialogLayout from "@/components/ui/dialogLayout";
import { LoadingState } from "@/components/ui/loadingState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getResearchById, publishResearch, type Research } from "@/lib/research";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ArrowLeft, CalendarRange, Check, ClipboardList, FileText, Flag, ListChecks, Mic, MicOff, Quote, ShieldAlert, Target, UsersRound } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ModalEditarPesquisa from "../components/ModalEditarPesquisa";
import PesquisadoresVinculados from "../components/PesquisadoresVinculados";
import ListarQuestoesSalvas from "../components/ListarQuestoesSalvas/ListarQuestoesSalvas";
import ColetasPesquisa from "../components/ColetasPesquisa";

const STEPS: { key: Research["status"]; label: string }[] = [
    { key: "DRAFT", label: "Rascunho" },
    { key: "PUBLISHED", label: "Publicada" },
    { key: "IN_FIELD", label: "Em campo" },
    { key: "CLOSED", label: "Encerrada" },
];

const DAY = 24 * 60 * 60 * 1000;

const parseDate = (iso?: string) => {
    const t = iso ? new Date(iso).getTime() : NaN;
    return Number.isNaN(t) ? null : t;
};

const fmt = (iso?: string) => {
    const t = parseDate(iso);
    return t === null ? "-" : new Date(t).toLocaleDateString('pt-BR');
};

const fmtLong = (iso?: string) => {
    const t = parseDate(iso);
    return t === null ? "-" : new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Onde estamos na vigência: texto e percentual (0 a 100). */
function vigencia(start: string, end: string, now: number) {
    const s = parseDate(start);
    const e = parseDate(end);
    if (s === null || e === null || e <= s) return null;

    const total = Math.max(1, Math.round((e - s) / DAY));
    const pct = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));

    let label: string;
    if (now < s) label = `Começa em ${plural(Math.ceil((s - now) / DAY), "dia", "dias")}`;
    else if (now > e + DAY) label = `Encerrada há ${plural(Math.floor((now - e) / DAY), "dia", "dias")}`;
    else {
        const left = Math.ceil((e - now) / DAY);
        label = left <= 0 ? "Termina hoje" : `${plural(left, "dia restante", "dias restantes")}`;
    }

    return { total, pct, label, upcoming: now < s, over: now > e + DAY };
}

type PageState =
    | { status: 'loading' }
    | { status: 'forbidden' }
    | { status: 'not-found' }
    | { status: 'error'; message: string }
    | { status: 'success'; research: Research };

export default function PesquisaDetalhePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [state, setState] = useState<PageState>({ status: 'loading' });
    const { user } = useCurrentUser();
    const [now] = useState(() => Date.now());

    useEffect(() => {
        setState({ status: 'loading' });
        getResearchById(params.id)
            .then((research) => setState({ status: 'success', research }))
            .catch((err) => {
                const status = (err as { status?: number })?.status;
                if (status === 403) setState({ status: 'forbidden' });
                else if (status === 404) setState({ status: 'not-found' });
                else setState({ status: 'error', message: err instanceof Error ? err.message : 'Erro ao carregar pesquisa' });
            });
    }, [params.id]);

    if (state.status === 'loading') {
        return <LoadingState label="Abrindo a pesquisa..." shape="page" />;
    }
    if (state.status === 'forbidden') {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <ShieldAlert className="text-destructive w-12 h-12" />
                <h2 className="text-xl font-semibold">Acesso negado</h2>
                <p className="text-sm text-muted-foreground max-w-sm">Esta pesquisa pertence a outra empresa. Volte e escolha uma pesquisa da sua lista.</p>
                <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-2"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
            </div>
        );
    }
    if (state.status === 'not-found') {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                <p className="text-sm">Pesquisa não encontrada.</p>
                <Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
            </div>
        );
    }
    if (state.status === 'error') {
        return (
            <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-2xl text-sm text-destructive">
                <p className="font-medium">Não foi possível abrir a pesquisa</p><p>{state.message}. Atualize a página para tentar de novo.</p>
            </div>
        );
    }

    const { research } = state;

    const handlePublish = async () => {
        try {
            const updated = await publishResearch(research.id);
            setState({ status: 'success', research: { ...research, status: updated.status } });
            toast.success('Pesquisa publicada! Ela já está visível para o aplicativo.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao publicar pesquisa');
        }
    };
    // As coletas e o áudio são dados pessoais: só o administrador da empresa da pesquisa vê (a API confere de novo).
    const canSeeCollections = user?.profile === 'ADMINISTRATOR';

    const stepIndex = Math.max(0, STEPS.findIndex((st) => st.key === research.status));
    const closed = research.status === 'CLOSED';
    const vig = vigencia(research.startDate, research.endDate, now);
    const audience = (research.targetAudience || "")
        .split(/[;\n]|,(?![^(]*\))/)
        .map((t) => t.trim())
        .filter(Boolean);

    return (
        <section className="flex flex-col gap-5">
            {/* Capa da pesquisa */}
            <article className="pa-card dark introduction-card !p-0">
                <Contour seed={research.id || 4} rings={14} cx={0.9} cy={0.4} size={1.2} width={900} height={320} />

                <div className="relative flex flex-col gap-7 p-7 sm:p-9">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                            href="/pesquisas"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[rgba(191,227,208,0.12)] px-3.5 text-[13px] font-medium text-[var(--mint)] transition-colors hover:bg-[rgba(191,227,208,0.2)]"
                        >
                            <ArrowLeft className="size-3.5" /> Pesquisas
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                            {research.recordInterview && (
                                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[rgba(224,145,122,0.18)] px-3 text-[13px] font-medium text-[#f0b09c]">
                                    <Mic className="size-3.5" /> Grava áudio
                                </span>
                            )}
                            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[rgba(191,227,208,0.12)] px-3 text-[13px] font-medium text-[var(--mint)]">
                                <CalendarRange className="size-3.5" />
                                {fmt(research.startDate)} → {fmt(research.endDate)}
                            </span>
                        </div>
                    </div>

                    <div className="min-w-0">
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-dark)]">Pesquisa</p>
                        <h1 className="break-words text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--fg-dark)] sm:text-[44px]">
                            {research.title}
                        </h1>
                    </div>

                    {/* Ciclo de vida */}
                    <ol className="flex items-start" aria-label="Etapa da pesquisa">
                        {STEPS.map((st, i) => {
                            const done = i < stepIndex;
                            const current = i === stepIndex;
                            const clay = current && closed;
                            return (
                                <li key={st.key} className="relative flex flex-1 flex-col items-start gap-2" aria-current={current ? "step" : undefined}>
                                    {i > 0 && (
                                        <span
                                            aria-hidden="true"
                                            className={`absolute top-[13px] h-0.5 ${i <= stepIndex ? "bg-[var(--mint)]/60" : "bg-white/10"}`}
                                            style={{ left: "calc(-100% + 28px)", width: "calc(100% - 28px)" }}
                                        />
                                    )}
                                    <span
                                        className={`relative z-10 grid size-7 place-items-center rounded-full text-[11px] font-bold ${
                                            done
                                                ? "bg-[var(--mint)] text-[var(--forest)]"
                                                : current
                                                    ? clay
                                                        ? "bg-[#e0917a] text-[var(--forest)] ring-4 ring-[rgba(224,145,122,0.25)]"
                                                        : "bg-[var(--mint)] text-[var(--forest)] ring-4 ring-[rgba(191,227,208,0.25)]"
                                                    : "bg-white/10 text-[var(--muted-dark)]"
                                        }`}
                                    >
                                        {done ? <Check className="size-3.5" /> : i + 1}
                                    </span>
                                    <span
                                        className={`text-[13px] ${
                                            current ? "font-semibold text-[var(--fg-dark)]" : "font-medium text-[var(--muted-dark)]"
                                        }`}
                                    >
                                        {st.label}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </article>

            <Tabs defaultValue="details" className="w-full flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <TabsList className="relative h-12 max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-border bg-white p-1 shadow-[0_14px_26px_-22px_rgba(10,20,16,0.4)]">
                        <TabsTrigger value="details" className="h-10 px-4 data-active:bg-ink data-active:text-white"><FileText />Visão Geral</TabsTrigger>
                        <TabsTrigger value="questions" className="h-10 px-4 data-active:bg-ink data-active:text-white"><ListChecks />Questões</TabsTrigger>
                        <TabsTrigger value="researchers" className="h-10 px-4 data-active:bg-ink data-active:text-white"><UsersRound />Pesquisadores</TabsTrigger>
                        {canSeeCollections && <TabsTrigger value="collections" className="h-10 px-4 data-active:bg-ink data-active:text-white"><ClipboardList />Coletas</TabsTrigger>}
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <DialogLayout
                            dialogTrigger="Editar" triggerButtonVariant="outline" triggerButtonSize="sm" dialogTitle="Editar dados da pesquisa" dialogDescription="Atualize os dados principais."
                            dialogContent={<ModalEditarPesquisa isMontagem={false} research={research} onSuccess={() => toast.success('Pesquisa atualizada!')} />}
                        />
                        {research.status === 'DRAFT' && (
                            <Button size="sm" onClick={handlePublish}><Flag />Publicar</Button>
                        )}
                    </div>
                </div>

                <TabsContent value="details" className="mt-0">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                        {/* Sobre a pesquisa */}
                        <article className="pa-card introduction-card lg:col-span-3" style={{ animationDelay: "120ms" }}>
                            <header className="pa-card-h">
                                <div className="pa-ic"><FileText /></div>
                                <div className="grow">
                                    <h3>Sobre a pesquisa</h3>
                                    <p className="desc">O que é e para que serve</p>
                                </div>
                            </header>

                            <div className="mt-6 flex flex-col gap-6">
                                {[
                                    { n: "01", title: "Descrição", text: research.description, empty: "Nenhuma descrição informada." },
                                    { n: "02", title: "Objetivo", text: research.objective, empty: "Nenhum objetivo especificado." },
                                ].map((b) => (
                                    <div key={b.n} className="relative rounded-[20px] bg-muted/60 p-5 pl-6">
                                        <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[var(--green)]" aria-hidden="true" />
                                        <div className="mb-2 flex items-center justify-between">
                                            <h4 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--green-deep)]">{b.title}</h4>
                                            <span className="text-[34px] font-light leading-none tracking-tighter text-[#c9d6ce]">{b.n}</span>
                                        </div>
                                        <p className={`whitespace-pre-line text-[15px] leading-relaxed ${b.text ? "text-foreground" : "text-muted-foreground italic"}`}>
                                            {b.text || b.empty}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </article>

                        <div className="flex flex-col gap-5 lg:col-span-2">
                            {/* Vigência */}
                            <article className="pa-card mint introduction-card" style={{ animationDelay: "240ms" }}>
                                <header className="pa-card-h">
                                    <div className="pa-ic"><CalendarRange /></div>
                                    <div className="grow">
                                        <h3>Vigência</h3>
                                        <p className="desc">{vig ? plural(vig.total, "dia", "dias") + " de pesquisa" : "Período da coleta"}</p>
                                    </div>
                                </header>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white/70 p-3.5">
                                        <p className="text-xs text-[var(--green-deep)]">Início</p>
                                        <p className="mt-0.5 text-[17px] font-semibold tracking-tight">{fmtLong(research.startDate)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/70 p-3.5">
                                        <p className="text-xs text-[var(--green-deep)]">Término</p>
                                        <p className="mt-0.5 text-[17px] font-semibold tracking-tight">{fmtLong(research.endDate)}</p>
                                    </div>
                                </div>

                                {vig && (
                                    <div className="mt-5">
                                        <div className="relative h-2.5 rounded-full bg-white/70">
                                            <div
                                                className="h-full rounded-full bg-[var(--green-deep)] transition-all duration-700"
                                                style={{ width: `${vig.pct}%` }}
                                            />
                                            {!vig.upcoming && !vig.over && (
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[var(--forest)] shadow"
                                                    style={{ left: `${vig.pct}%` }}
                                                />
                                            )}
                                        </div>
                                        <p className="mt-2.5 text-[13px] font-semibold text-[var(--green-deep)]">{vig.label}</p>
                                    </div>
                                )}
                            </article>

                            {/* Público-alvo */}
                            <article className="pa-card introduction-card" style={{ animationDelay: "360ms" }}>
                                <header className="pa-card-h">
                                    <div className="pa-ic"><Target /></div>
                                    <div className="grow">
                                        <h3>Público-alvo</h3>
                                        <p className="desc">Quem deve ser entrevistado</p>
                                    </div>
                                </header>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {audience.length > 0 ? (
                                        audience.map((t, i) => (
                                            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[#e4ece7] px-3.5 py-1.5 text-sm font-medium text-[var(--green-deep)]">
                                                <Quote className="size-3 opacity-60" />{t}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Não especificado</p>
                                    )}
                                </div>
                            </article>
                        </div>

                        {/* Gravação */}
                        <article
                            className={`pa-card introduction-card lg:col-span-5 ${research.recordInterview ? "" : "!bg-muted/50"}`}
                            style={{ animationDelay: "480ms" }}
                        >
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                                <div
                                    className={`grid size-14 shrink-0 place-items-center rounded-2xl ${
                                        research.recordInterview ? "bg-[#f3e0d9] text-[var(--clay-ink)]" : "bg-[#e4ece7] text-muted-foreground"
                                    }`}
                                >
                                    {research.recordInterview ? <Mic className="size-6" /> : <MicOff className="size-6" />}
                                </div>

                                <div className="grow">
                                    <h3 className="text-base font-semibold tracking-tight">
                                        Gravação da entrevista · {research.recordInterview ? "Ligada" : "Desligada"}
                                    </h3>
                                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                        {research.recordInterview
                                            ? "O aplicativo grava o áudio da coleta e exige o consentimento do entrevistado antes de começar."
                                            : "O aplicativo coleta apenas as respostas, sem gravar áudio."}
                                    </p>
                                </div>

                                {research.recordInterview && (
                                    <div className="flex h-10 items-center gap-[3px]" aria-hidden="true">
                                        {Array.from({ length: 28 }).map((_, i) => (
                                            <span
                                                key={i}
                                                className="w-[3px] animate-pulse rounded-full bg-[#ab6049]/70"
                                                style={{
                                                    height: `${20 + Math.abs(Math.sin(i * 1.3) * 80)}%`,
                                                    animationDelay: `${(i % 7) * 120}ms`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </article>
                    </div>
                </TabsContent>

                <TabsContent value="questions" className="mt-0">
                    <ListarQuestoesSalvas researchId={params.id} />
                </TabsContent>

                <TabsContent value="researchers" className="mt-0">
                    <PesquisadoresVinculados researchId={research.id} companyId={research.companyId} />
                </TabsContent>

                {canSeeCollections && (
                    <TabsContent value="collections" className="mt-0">
                        <ColetasPesquisa researchId={research.id} recordInterview={research.recordInterview} />
                    </TabsContent>
                )}
            </Tabs>
        </section>
    );
}