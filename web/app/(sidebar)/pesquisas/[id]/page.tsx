'use client'

import { Badge } from "@/components/ui/badge";
import BannerComponent from "@/components/ui/bannerComponent";
import { Button } from "@/components/ui/button";
import DialogLayout from "@/components/ui/dialogLayout";
import { Spinner } from "@/components/ui/spinner";
import { getResearchById, type Research } from "@/lib/research";
import { ArrowLeft, Calendar, FileText, ShieldAlert, Target } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import InfoCard from "../../(home)/components/infoCards";
import ModalEditarPesquisa from "../components/ModalEditarPesquisa";
import ListarQuestoesSalvas from "../components/ListarQuestoesSalvas";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { label: "Rascunho", variant: "outline" },
    PUBLISHED: { label: "Publicada", variant: "default" },
    IN_FIELD: { label: "Em Campo", variant: "default" },
    CLOSED: { label: "Encerrada", variant: "destructive" },
};

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
    const [activeTab, setActiveTab] = useState<'details' | 'questions'>('details');

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
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
                <Spinner /><p className="text-sm">Carregando detalhes da pesquisa...</p>
            </div>
        );
    }
    if (state.status === 'forbidden') {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <ShieldAlert className="text-destructive w-12 h-12" />
                <h2 className="text-xl font-semibold">Acesso negado</h2>
                <p className="text-sm text-muted-foreground max-w-sm">Esta pesquisa pertence a outra empresa.</p>
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
            <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg text-sm text-destructive">
                <p className="font-medium">Erro ao carregar a pesquisa</p><p>{state.message}</p>
            </div>
        );
    }

    const { research } = state;
    const currentStatus = statusConfig[research.status] ?? { label: research.status || "Ativa", variant: "outline" };

    return (
        <section className="flex flex-col gap-6">
            <BannerComponent title={research.title} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
                <div className="flex items-center gap-2">
                    <Button type="button" variant={activeTab === 'details' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('details')}>
                        Visão Geral
                    </Button>
                    <Button type="button" variant={activeTab === 'questions' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('questions')}>
                        Questões e Formulário
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <DialogLayout
                        dialogTrigger="Editar" dialogTitle="Editar Dados da Pesquisa" dialogDescription="Atualize os dados principais."
                        dialogContent={<ModalEditarPesquisa isMontagem={false} research={research} onSuccess={() => toast.success('Pesquisa atualizada!')} />}
                    />
                    <div className="flex items-center gap-2 border-l pl-3">
                        <span className="text-xs text-muted-foreground">Situação:</span>
                        <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
                    </div>
                </div>
            </div>

            {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6">
                    <div className="md:col-span-2 md:row-span-2">
                        <InfoCard
                            cardClassName="h-full" animationDelayN={2} isCardFooter={false}
                            cardTitle={<div className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /><span>Informações da Pesquisa</span></div>}
                            cardDescription="Detalhes estruturais e objetivos cadastrados"
                            cardContent={
                                <div className="grid gap-6">
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase mb-1">Descrição</h4>
                                        <p className="text-sm leading-relaxed text-foreground">{research.description || "Nenhuma descrição informada."}</p>
                                    </div>
                                    <hr />
                                    <div className="pt-4">
                                        <h4 className="text-xs font-semibold uppercase mb-1">Objetivo</h4>
                                        <p className="text-sm leading-relaxed text-foreground">{research.objective || "Nenhum objetivo especificado."}</p>
                                    </div>
                                </div>
                            }
                        />
                    </div>
                    <div className="md:col-span-1 md:row-span-1">
                        <InfoCard
                            cardClassName="h-full" animationDelayN={3} isCardFooter={false}
                            cardTitle={<div className="flex items-center gap-2 text-base"><Target color="#AB6049" className="w-4 h-4 text-primary" /><span>Público-Alvo</span></div>}
                            cardContent={<p className="text-sm font-medium text-foreground">{research.targetAudience || "Não especificado"}</p>}
                        />
                    </div>
                    <div className="md:col-span-1 md:row-span-1">
                        <InfoCard
                            cardClassName="h-full" animationDelayN={4} isCardFooter={false}
                            cardTitle={<div className="flex items-center gap-2 text-base"><Calendar color="#AB6049" className="w-4 h-4 text-primary" /><span>Vigência</span></div>}
                            cardContent={
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between"><span>Início:</span><span className="font-medium">{research.startDate ? new Date(research.startDate).toLocaleDateString('pt-BR') : "-"}</span></div>
                                    <div className="flex justify-between"><span>Término:</span><span className="font-medium">{research.endDate ? new Date(research.endDate).toLocaleDateString('pt-BR') : "-"}</span></div>
                                </div>
                            }
                        />
                    </div>
                </div>
            )}

            {activeTab === 'questions' && (
                <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
                    <ListarQuestoesSalvas researchId={params.id} />
                </div>
            )}
        </section>
    );
}