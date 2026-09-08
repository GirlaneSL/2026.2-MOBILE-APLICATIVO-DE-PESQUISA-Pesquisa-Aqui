'use client'

import { useState } from "react";
import BannerComponent from "@/components/ui/bannerComponent";
import InfoCard from "../(home)/components/infoCards";
import DialogLayout from "@/components/ui/dialogLayout";
import CadastrarPesquisaForm from "./components/CadastrarPesquisaForm";
import TabelaPesquisas from "./components/TabelaPesquisas";

export default function Pesquisas() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const forceRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <>
            <section className="flex flex-col gap-5">
                <BannerComponent title="Dados das Pesquisas"></BannerComponent>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    <InfoCard
                        isCardFooter={false}
                        animationDelayN={2}
                        cardTitle="Cadastrar Pesquisa"
                        cardDescription="Cadastre Uma Nova Pesquisa"
                        cardClassName={"relative"}
                        cardContent={
                            <>
                                <br />
                                <br />
                                <div className="absolute bottom-5 right-5 flex justify-end ">
                                    <DialogLayout
                                        triggerButtonVariant="outline"
                                        dialogTrigger="Cadastrar"
                                        dialogTitle="Cadastramento de Pesquisa"
                                        dialogDescription="Informe os Dados da Pesquisa"
                                        dialogContent={
                                            <div>
                                                <CadastrarPesquisaForm onSuccess={forceRefresh} />
                                            </div>
                                        }
                                    />
                                </div>
                            </>
                        }
                    />

                    <InfoCard
                        cardTitle="Editar / Deletar"
                        cardDescription="Consulte e Gerencie As Pesquisas"
                        isCardFooter={false}
                        cardClassName="relative"
                        animationDelayN={4}
                        cardContent={
                            <>
                                <br />
                                <br />
                                <div className="absolute bottom-5 right-5 flex justify-end ">
                                    <DialogLayout
                                        triggerButtonVariant="outline"
                                        dialogTrigger="Exibir"
                                        dialogTitle="Consultar Pesquisas"
                                        dialogDescription="Consulte e gerencie as pesquisas disponíveis no sistema"
                                        dialogContent={
                                            <div>
                                                <TabelaPesquisas 
                                                    refreshTrigger={refreshTrigger} 
                                                    onChange={forceRefresh}
                                                />
                                            </div>
                                        }
                                    />
                                </div>
                            </>
                        }
                    />
                </section>

                <section className="grid grid-cols-1 gap-5">
                    <InfoCard
                        cardTitle="Pesquisas"
                        isCardFooter={false}
                        cardClassName="col-span-1"
                        animationDelayN={5}
                        cardContent={
                            <>
                                <div className="max-h-50 overflow-auto">
                                    <TabelaPesquisas 
                                        refreshTrigger={refreshTrigger} 
                                        allowActions={false} 
                                    />
                                </div>
                            </>
                        }
                    />
                </section>
            </section >
        </>
    )
}