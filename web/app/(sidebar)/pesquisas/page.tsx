import BannerComponent from "@/components/ui/bannerComponent";
import InfoCard from "../(home)/components/infoCards";
import DialogLayout from "@/components/ui/dialogLayout";
import CadastrarPesquisaForm from "./components/CadastrarPesquisaForm";
import MontarPesquisaForm from "./components/MontarPesquiaForm";

export default function Pesquisas() {
    return (
        <>
            <section className="flex flex-col gap-5">
                <BannerComponent title="Dados das Pesquisas"></BannerComponent>

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                                                <CadastrarPesquisaForm />
                                            </div>
                                        }
                                    />
                                </div>
                            </>
                        }
                    />
                    <InfoCard
                        cardTitle="Montar Pesquisa"
                        cardClassName="relative col-span-1 md:col-span-1 lg:col-span-1"
                        animationDelayN={3}
                        cardContent={
                            <>
                                <br />
                                <br />
                                <div className="absolute bottom-5 right-5 flex justify-end ">
                                    <DialogLayout
                                        triggerButtonVariant="outline"
                                        dialogTrigger="Montar"
                                        dialogTitle="Cadastramento de Pesquisa"
                                        dialogDescription="Informe os Dados da Pesquisa"
                                        dialogContent={
                                            <div>
                                                <MontarPesquisaForm />
                                            </div>
                                        }
                                    />
                                </div>
                            </>
                        }
                    />
                    <InfoCard
                        cardClassName=" col-span-1 md:col-span-3 lg:col-span-1"
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
            </section >
        </>
    )
}