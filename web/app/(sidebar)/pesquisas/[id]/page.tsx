// app/(sidebar)/pesquisas/[id]/page.tsx
'use client'

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getResearchById, type Research } from "@/lib/research";
import BannerComponent from "@/components/ui/bannerComponent";
import { ShieldAlert } from "lucide-react";

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PUBLISHED: "Publicada",
    IN_FIELD: "Em Campo",
    CLOSED: "Encerrada",
};

type PageState =
    | { status: 'loading' }
    | { status: 'forbidden' }
    | { status: 'not-found' }
    | { status: 'error'; message: string }
    | { status: 'success'; research: Research };

export default function PesquisaDetalhePage() {
    const params = useParams<{ id: string }>();
    const [state, setState] = useState<PageState>({ status: 'loading' });

    useEffect(() => {
        setState({ status: 'loading' });

        getResearchById(params.id)
            .then((research) => setState({ status: 'success', research }))
            .catch((err) => {
                const status = (err as { status?: number })?.status;

                if (status === 403) {
                    setState({ status: 'forbidden' });
                } else if (status === 404) {
                    setState({ status: 'not-found' });
                } else {
                    setState({
                        status: 'error',
                        message: err instanceof Error ? err.message : 'Erro ao carregar pesquisa',
                    });
                }
            });
    }, [params.id]);

    if (state.status === 'loading') {
        return <p className="text-sm text-muted-foreground">Carregando pesquisa...</p>;
    }

    if (state.status === 'forbidden') {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <ShieldAlert className="text-red-500" size={40} />
                <h2 className="text-lg font-semibold">Acesso negado</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Esta pesquisa pertence a outra empresa. Você não tem permissão para visualizá-la.
                </p>
            </div>
        );
    }

    if (state.status === 'not-found') {
        return <p className="text-sm text-muted-foreground">Pesquisa não encontrada.</p>;
    }

    if (state.status === 'error') {
        return <p className="text-sm text-red-500">Erro: {state.message}</p>;
    }

    const { research } = state;

    return (
        <section className="flex flex-col gap-5">
            <BannerComponent title={research.title} />

            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="font-semibold">Descrição</h3>
                    <p className="text-sm text-muted-foreground">{research.description}</p>
                </div>

                <div>
                    <h3 className="font-semibold">Objetivo</h3>
                    <p className="text-sm text-muted-foreground">{research.objective}</p>
                </div>

                <div>
                    <h3 className="font-semibold">Público-Alvo</h3>
                    <p className="text-sm text-muted-foreground">{research.targetAudience}</p>
                </div>

                <div>
                    <h3 className="font-semibold">Status</h3>
                    <p className="text-sm text-muted-foreground">
                        {statusLabels[research.status] ?? research.status}
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold">Vigência</h3>
                    <p className="text-sm text-muted-foreground">
                        {new Date(research.startDate).toLocaleDateString('pt-BR')} até{' '}
                        {new Date(research.endDate).toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>
        </section>
    );
}