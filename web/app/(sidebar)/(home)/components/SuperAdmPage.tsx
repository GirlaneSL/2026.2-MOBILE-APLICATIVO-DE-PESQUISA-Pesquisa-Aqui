'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { getActiveResearchesInMonth, getResearches, getResearchesByMonth, type Research } from "@/lib/research";
import { useEffect, useState } from "react";
import ExibirEditar from "../../empresas/components/ExibirExcluir";
import EstatisticasChart from "../components/EstatisticasChart";
import InfoCard from "../components/infoCards";
import UltimasAtualizacoesList from "../components/UltimasAtualizacoesList";

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PUBLISHED: "Publicada",
    IN_FIELD: "Em Campo",
    CLOSED: "Encerrada",
};

type ResearchDisplay = Omit<Research, "status"> & { status: string };

export default function SuperAdmPage() {

    const [researches, setResearches] = useState<ResearchDisplay[]>([])
    const [rawResearches, setRawResearches] = useState<Research[]>([]);

    useEffect(() => {
        getResearches()
            .then((data) => {
                setRawResearches(data);
                setResearches(
                    data.map((r) => ({
                        ...r,
                        status: statusLabels[r.status] ?? r.status,
                        respostas: 0,
                    }))
                )
            }
            )
            .catch((error) => {
                console.log(error);
                alert('Erro ao carregar pesquisas')
            })
    }, [])

    const now = new Date();
    const activeThisMonth = getActiveResearchesInMonth(
        rawResearches,
        now.getMonth() + 1,
        now.getFullYear()
    )

    const chartData = getResearchesByMonth(rawResearches, now.getFullYear());

    return (
        <section className="relative min-h-screen flex flex-col gap-5">
            <BannerComponent title="Painel de Dados" />

            <section className="flex flex-col gap-5 max-lg:gap-4 ">
                <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-1 max-lg:gap-4">
                    <InfoCard
                        cardClassName=" shadow-md introduction-card"
                        animationDelayN={2}
                        isCardFooter={false}
                        cardTitle="Empresas Ativos"
                        cardContent={<EstatisticasChart valor={"199"} variant="bar" />}
                    />

                    <InfoCard
                        cardClassName="shadow-md"
                        animationDelayN={3}
                        isCardFooter={false}
                        cardTitle="Administradores Ativas"
                        cardContent={<EstatisticasChart valor="288" variant="bar" />}
                    />

                    <InfoCard
                        cardClassName=" shadow-md introduction-card"
                        animationDelayN={4}
                        isCardFooter={false}
                        cardTitle="Ultimas Atualizações"
                        cardContent={<UltimasAtualizacoesList />}
                    />
                </div>

                <div className="grid grid-cols-5 gap-5 max-lg:grid-cols-1 max-lg:gap-4">
                    <InfoCard
                        cardClassName="shadow-md col-span-5 "
                        animationDelayN={5}
                        isCardFooter={false}
                        cardTitle="Empresas / Administradores"
                        CardContentClassName={"max-h-50 overflow-auto"}
                        cardContent={
                            <div className="flex flex-col gap-2 ">
                                <ExibirEditar allowActions={false} />
                            </div>
                        }
                    />
                </div>
            </section>
        </section>
    );
}