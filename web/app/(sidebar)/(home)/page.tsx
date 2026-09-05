'use client'

import { Skeleton } from "@/components/ui/skeleton";
import InfoCard from "./components/infoCards";
import Tabela from "./components/tabela";
import BannerComponent from "@/components/ui/bannerComponent";
import EstatisticasChart from "./components/EstatisticasChart";
import UltimasAtualizacoesList from "./components/UltimasAtualizacoesList";
import { columns } from "@/app/(sidebar)/(home)/data/pesquisasData";
import { useEffect, useState } from "react";
import { getActiveResearchesInMonth, getResearches, getResearchesByMonth } from "@/lib/research";

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PUBLISHED: "Publicada",
    IN_FIELD: "Em Campo",
    CLOSED: "Encerrada",
};

export default function Home() {

    const [researches, setResearches] = useState([])
    const [rawResearches, setRawResearches] = useState<any[]>([]);

    useEffect(() => {
        getResearches()
            .then((data) => {
                setRawResearches(data);
                setResearches(
                    data.map((r: any) => ({
                        ...r,
                        status: statusLabels[r.status] ?? r.status
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
                        cardTitle="Pesquisas Ativas"
                        cardContent={<EstatisticasChart valor={String(activeThisMonth.length)} chartData={chartData} variant="bar" />}
                    />

                    <InfoCard
                        cardClassName=" shadow-md introduction-card"
                        animationDelayN={3}
                        isCardFooter={false}
                        cardTitle="Ultimas Atualizações"
                        cardContent={<UltimasAtualizacoesList />}
                    />

                    <InfoCard
                        cardClassName="shadow-md"
                        animationDelayN={4}
                        isCardFooter={false}
                        cardTitle="Pesquisadores Ativos"
                        cardContent={<EstatisticasChart valor="69" />}
                    />
                </div>

                <div className="grid grid-cols-5 gap-5 max-lg:grid-cols-1 max-lg:gap-4">
                    <InfoCard
                        cardClassName="shadow-md col-span-3 "
                        animationDelayN={5}
                        isCardFooter={false}
                        cardTitle="Pesquisas"
                        cardContent={
                            <div className="flex flex-col gap-2 ">
                                <Tabela columns={columns} data={researches} />
                            </div>
                        }
                    />

                    <InfoCard
                        cardClassName="shadow-md col-span-2 max-lg:col-span-3 "
                        animationDelayN={5}
                        isCardFooter={false}
                        cardTitle="Outras Coisas Coisadas"
                        cardContent={
                            <div className="flex flex-col gap-2">
                                <Skeleton className="w-full h-10" />
                                <Skeleton className="w-full h-10" />
                                <Skeleton className="w-full h-10" />
                                <Skeleton className="w-full h-10" />
                            </div>
                        }
                    />
                </div>
            </section>
        </section>
    );
}