'use client'

import { columns } from "@/app/(sidebar)/(home)/data/pesquisasData";
import BannerComponent from "@/components/ui/bannerComponent";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveResearchesInMonth, getResearches, getResearchesByMonth, type Research } from "@/lib/research";
import { useEffect, useState } from "react";
import EstatisticasChart from "../components/EstatisticasChart";
import InfoCard from "../components/infoCards";
import Tabela from "../components/tabela";
import UltimasAtualizacoesList from "../components/UltimasAtualizacoesList";
import TabelaPesquisas from "../../pesquisas/components/TabelaPesquisas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bolt } from "lucide-react";

const statusLabels: Record<string, string> = {
    DRAFT: "Rascunho",
    PUBLISHED: "Publicada",
    IN_FIELD: "Em Campo",
    CLOSED: "Encerrada",
};

type ResearchDisplay = Omit<Research, "status"> & { status: string };

export default function AdmPage() {

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
                        cardTitle="Pesquisas Ativas"
                        cardContent={<EstatisticasChart valor={String(activeThisMonth.length)} chartData={chartData} variant="bar" />}
                    />

                    <InfoCard
                        cardClassName="shadow-md"
                        animationDelayN={3}
                        isCardFooter={false}
                        cardTitle="Pesquisadores Ativos"
                        cardContent={<EstatisticasChart valor="69" />}
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
                        cardClassName="shadow-md col-span-5"
                        animationDelayN={5}
                        isCardFooter={false}
                        cardTitle="Pesquisas"
                        CardContentClassName={"max-h-50 overflow-auto"}
                        cardContent={
                            <Tabs defaultValue="pesquisas" className="w-full">
                                <TabsList className="grid grid-cols-2 gap-2 w-fit sticky top-0 z-10 px-5 verde-marrom shadow border-t">
                                    <Bolt size={13} className="absolute left-1 top-1/2 -translate-y-1/2 opacity-15"/>
                                    <Bolt size={13} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-15"/>
                                    <TabsTrigger value="pesquisas">Pesquisas</TabsTrigger>
                                    <TabsTrigger value="outraAba">Pesquisadores</TabsTrigger>
                                </TabsList>

                                <TabsContent value="pesquisas" className="pt-2">
                                    <div className="flex flex-col gap-2">
                                        <TabelaPesquisas allowActions={false} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="outraAba" className="pt-2">
                                    <p className="text-sm text-muted-foreground">Conteúdo da nova aba...</p>
                                </TabsContent>
                            </Tabs>
                        }
                    />

                </div>
            </section>
        </section>
    );
}