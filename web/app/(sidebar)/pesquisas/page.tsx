import BannerComponent from "@/components/ui/bannerComponent";
import InfoCard from "../(home)/components/infoCards";
import DialogLayout from "@/components/ui/dialogLayout";
import CadastrarPesquisaForm from "./components/CadastrarPesquisaForm";
import TabelaPesquisas from "./components/TabelaPesquisas";
// Removida a importação de MontarPesquisaForm daqui, pois agora é gerenciado via Tabela/Modal

export default function Pesquisas() {
    return (
        <>
            <section className="flex flex-col gap-5">
                <BannerComponent title="Dados das Pesquisas"></BannerComponent>

                {/* Alterado para grid-cols-2 em telas grandes, já que removemos um card */}
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
                                                <CadastrarPesquisaForm />
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
                                                <TabelaPesquisas />
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
                                    <TabelaPesquisas allowActions={false}></TabelaPesquisas>
                                </div>
                            </>
                        }
                    />
                </section>
            </section >
        </>
    )
}