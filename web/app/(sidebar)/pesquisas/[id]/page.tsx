'use client'

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getResearchById, type Research } from "@/lib/research";
import BannerComponent from "@/components/ui/bannerComponent";

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PUBLISHED: "Publicada",
    IN_FIELD: "Em Campo",
    CLOSED: "Encerrada",
};

export default function PesquisaDetalhePage() {
    const params = useParams<{ id: string }>();
    const [research, setResearch] = useState<Research | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getResearchById(params.id)
            .then(setResearch)
            .catch((err) => {
                console.error(err);
                setError(err instanceof Error ? err.message : 'Erro ao carregar pesquisa');
            })
            .finally(() => setLoading(false));
    }, [params.id]);

    if (loading) {
        return <p className="text-sm text-muted-foreground">Carregando pesquisa...</p>;
    }

    if (error) {
        return <p className="text-sm text-red-500">Erro: {error}</p>;
    }

    if (!research) {
        return <p className="text-sm text-muted-foreground">Pesquisa não encontrada.</p>;
    }

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