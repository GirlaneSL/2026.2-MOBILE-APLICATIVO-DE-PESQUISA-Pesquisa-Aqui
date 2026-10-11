'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { Spinner } from "@/components/ui/spinner";
import { isSessionExpiredError } from "@/lib/apiFetcher";
import { buildAdminActivities, countByMonth } from "@/lib/dashboard";
import { getActiveResearchesInMonth, getResearches, getResearchesByMonth, type Research } from "@/lib/research";
import { getResearchers, type UserItem } from "@/lib/user";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import EstatisticasChart from "../components/EstatisticasChart";
import InfoCard from "../components/infoCards";
import UltimasAtualizacoesList from "../components/UltimasAtualizacoesList";
import TabelaPesquisas from "../../pesquisas/components/TabelaPesquisas";
import ListaPesquisadores from "../../pesquisadores/components/ListaPesquisadores";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bolt } from "lucide-react";

export default function AdmPage() {

    const [researches, setResearches] = useState<Research[]>([]);
    const [researchers, setResearchers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getResearches(), getResearchers()])
            .then(([researchesData, researchersData]) => {
                if (cancelled) return;
                setResearches(researchesData ?? []);
                setResearchers(researchersData ?? []);
            })
            .catch((error) => {
                if (cancelled || isSessionExpiredError(error)) return;
                console.error(error);
                toast.error('Erro ao carregar dados do painel');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [])

    const [year] = useState(() => new Date().getFullYear());
    const [month] = useState(() => new Date().getMonth() + 1);

    const activeThisMonth = getActiveResearchesInMonth(researches, month, year);

    const researchesChart = useMemo(
        () => getResearchesByMonth(researches, year),
        [researches, year]
    );

    const researchersChart = useMemo(
        () => countByMonth(researchers, (r) => r.createdAt, year, 'Pesquisadores'),
        [researchers, year]
    );

    const activities = useMemo(
        () => buildAdminActivities(researches, researchers),
        [researches, researchers]
    );

    const statValue = (n: number) => (loading ? <Spinner className="size-8" /> : n);

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
                        cardContent={
                            <EstatisticasChart
                                valor={statValue(activeThisMonth.length)}
                                chartData={researchesChart}
                                seriesKey="Pesquisas"
                                seriesLabel="Pesquisas ativas"
                                variant="bar"
                            />
                        }
                    />

                    <InfoCard
                        cardClassName="shadow-md"
                        animationDelayN={3}
                        isCardFooter={false}
                        cardTitle="Pesquisadores Ativos"
                        cardContent={
                            <EstatisticasChart
                                valor={statValue(researchers.length)}
                                chartData={researchersChart}
                                seriesKey="Pesquisadores"
                                seriesLabel="Pesquisadores cadastrados"
                                variant="bar"
                            />
                        }
                    />

                    <InfoCard
                        cardClassName=" shadow-md introduction-card"
                        animationDelayN={4}
                        isCardFooter={false}
                        cardTitle="Ultimas Atualizações"
                        cardContent={<UltimasAtualizacoesList items={activities} loading={loading} />}
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
                                    <TabsTrigger value="pesquisadores">Pesquisadores</TabsTrigger>
                                </TabsList>

                                <TabsContent value="pesquisas" className="pt-2">
                                    <div className="flex flex-col gap-2">
                                        <TabelaPesquisas allowActions={false} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="pesquisadores" className="pt-2">
                                    <ListaPesquisadores
                                        researchers={researchers}
                                        companyNames={{}}
                                        loading={loading}
                                        canDelete={false}
                                        showCompany={false}
                                        onDeleted={() => { }}
                                        maxHeightClassName="max-h-none"
                                    />
                                </TabsContent>
                            </Tabs>
                        }
                    />

                </div>
            </section>
        </section>
    );
}
