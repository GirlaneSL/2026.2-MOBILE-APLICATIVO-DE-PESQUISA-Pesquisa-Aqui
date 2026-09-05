import { Skeleton } from "@/components/ui/skeleton";
import InfoCard from "./components/infoCards";
import Tabela from "./components/tabela";
import BannerComponent from "@/components/ui/bannerComponent";
import EstatisticasChart from "./components/EstatisticasChart";
import UltimasAtualizacoesList from "./components/UltimasAtualizacoesList";
import { pesquisas, columns } from "@/app/(sidebar)/(home)/data/pesquisasData";

export default function Home() {
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
                        cardContent={<EstatisticasChart valor="67" />}
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
                                <Tabela columns={columns} data={pesquisas} />
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