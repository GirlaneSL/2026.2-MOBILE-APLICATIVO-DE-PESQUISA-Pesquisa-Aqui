'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import DialogLayout from "@/components/ui/dialogLayout";
import InfoCard from "../(home)/components/infoCards";
import { usuario } from "@/usuarios";
import CadastrarPesquisadorForm from "./components/CadastrarPesquisadorForm";

export default function PesquisadoresPage() {
    return (
        <>
            <section className="flex flex-col gap-5">
                <BannerComponent title="Dados dos Pesquisadores" />

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {usuario.profile === 'SUPERADMINISTRATOR' && (
                        <InfoCard
                            isCardFooter={false}
                            animationDelayN={2}
                            cardTitle="Cadastrar Pesquisador"
                            cardDescription="Cadastre Um Novo Pesquisador"
                            cardClassName="relative"
                            cardContent={
                                <>
                                    <br />
                                    <br />
                                    <div className="absolute bottom-5 right-5 flex justify-end ">
                                        <DialogLayout
                                            triggerButtonVariant="outline"
                                            dialogTrigger="Cadastrar"
                                            dialogTitle="Cadastramento do Pesquisador"
                                            dialogDescription="Informe os Dados do Pequisador"
                                            dialogContent={
                                                <div>
                                                    <CadastrarPesquisadorForm />
                                                </div>
                                            }
                                        />
                                    </div>
                                </>
                            }
                        />
                    )}

                    <InfoCard
                        cardTitle=""
                        cardClassName="col-span-1 md:col-span-1 lg:col-span-1"
                        animationDelayN={3}
                    />

                    <InfoCard
                        cardClassName=" col-span-1 md:col-span-2 lg:col-span-1"
                        animationDelayN={4}
                    />
                </section>

                <section className="grid grid-cols-5 gap-5 md:col-span-2">
                    <InfoCard
                        cardClassName="col-span-5 md:col-span-3 lg:col-span-3"
                        animationDelayN={5}
                    />
                    <InfoCard
                        cardClassName="col-span-5 md:col-span-2 lg:col-span-2"
                        animationDelayN={5}
                    />
                </section>
            </section>
        </>
    );
}