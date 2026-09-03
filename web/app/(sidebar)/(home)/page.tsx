import { Skeleton } from "@/components/ui/skeleton";
import { Chart } from "./components/grafico";
import InfoCard from "./components/infoCards";
import Tabela from "./components/tabela";
import { Activity, Bolt } from "lucide-react";
import BannerComponent from "@/components/ui/bannerComponent";


const pesquisas = [
    {
        nome: "Pesquisa de satisfação",
        status: "Ativa",
        respostas: 120,
        data: "02/09/2026",
    },
    {
        nome: "Pesquisa de produto1",
        status: "Encerrada",
        respostas: 85,
        data: "01/09/2026",
    },
    {
        nome: "Pesquisa de produto2",
        status: "Ativa",
        respostas: 85,
        data: "01/09/2026",
    },
    {
        nome: "Pesquisa de produto3",
        status: "Encerrada",
        respostas: 85,
        data: "01/09/2026",
    },
]

const columns = [
    { key: "nome", label: "Pesquisa" },
    { key: "status", label: "Status" },
    { key: "respostas", label: "Respostas" },
    { key: "data", label: "Data" },
] as const

export default function Home() {
    return (
        <section className="relative min-h-screen flex flex-col gap-10">
            <BannerComponent title="Painel de Dados"></BannerComponent>

            <section className="flex flex-col gap-10 max-lg:gap-4 ">
                <div className="grid grid-cols-3 gap-10 max-lg:grid-cols-1 max-lg:gap-4">
                    <InfoCard
                        cardClassName=" shadow-md "
                        isCardFooter={false}
                        cardTitle="Pesquisas Ativas"
                        cardContent={
                            <div className="grid w-full grid-cols-3 gap-2 max-lg:flex max-lg:flex-col max-lg:gap-3">
                                <div className="flex items-center justify-center">
                                    <span className="text-5xl">67</span>
                                </div>

                                <div className="col-span-2">
                                    <Chart />
                                </div>
                            </div>
                        }>
                    </InfoCard >
                    <InfoCard
                        cardClassName=" shadow-md "
                        isCardFooter={false}
                        cardTitle="Ultimas Atualizações"
                        cardContent={
                            <div className="flex flex-col gap-2 overflow-y-auto h-55 custom-scrollbar">
                                <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                                    <Activity className="shrink-0" />

                                    <span className="truncate">
                                        aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                                    </span>
                                </Skeleton>
                                <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                                    <Activity className="shrink-0" />

                                    <span className="truncate">
                                        aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                                    </span>
                                </Skeleton>
                                <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                                    <Activity className="shrink-0" />

                                    <span className="truncate">
                                        aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                                    </span>
                                </Skeleton>
                                <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                                    <Activity className="shrink-0" />

                                    <span className="truncate">
                                        aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                                    </span>
                                </Skeleton>
                                <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                                    <Activity className="shrink-0" />

                                    <span className="truncate">
                                        aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                                    </span>
                                </Skeleton>
                            </div>
                        }>
                    </InfoCard >
                    <InfoCard cardClassName="shadow-md"
                        isCardFooter={false}
                        cardTitle="Pesquisadores Ativos"
                        cardContent={
                            <div className="grid w-full grid-cols-3 gap-2 max-lg:flex max-lg:flex-col max-lg:gap-3">
                                <div className="flex items-center justify-center">
                                    <span className="text-5xl">69</span>
                                </div>

                                <div className="col-span-2">
                                    <Chart />
                                </div>
                            </div>
                        } />
                </div>
                <div className="grid grid-cols-5 gap-10 max-lg:grid-cols-1 max-lg:gap-4">
                    <InfoCard
                        cardClassName="shadow-md col-span-3 "
                        isCardFooter={false}
                        cardTitle="Pesquisas"
                        cardContent={
                            <div className="flex flex-col gap-2 ">
                                <Tabela
                                    columns={columns}
                                    data={pesquisas}
                                />
                            </div>
                        }
                    />

                    <InfoCard
                        cardClassName="shadow-md col-span-2 max-lg:col-span-3 "
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

        </section >
    );
}