import BannerComponent from "@/components/ui/bannerComponent";
import { Button } from "@/components/ui/button";
import { ComboBoxLayout } from "@/components/ui/comboboxLayout";
import DialogLayout from "@/components/ui/dialogLayout";
import { Input } from "@/components/ui/input";
import InfoCard from "../(home)/components/infoCards";

export default function EmpresaPage() {
    return (
        <>
            <section className="flex flex-col gap-6">
                <BannerComponent title="Empresas"></BannerComponent>
                <section className="grid grid-cols-3 gap-4">
                    <InfoCard
                        isCardFooter={false}
                        cardTitle="Cadastrar Empresa"
                        cardDescription="Cadastre Uma Nova Empresa"
                        cardContent={
                            <div>
                                <DialogLayout
                                    triggerButtonVariant="outline"
                                    dialogTrigger="Cadastro"
                                    dialogTitle="Cadastramento de Empresas"
                                    dialogDescription="Informe os Dados da Empresa"
                                    dialogContent={
                                        <div>
                                            <form>
                                                <div className="flex flex-col gap-5">
                                                    <div>
                                                        <label htmlFor="name">Nome da Empresa*</label>
                                                        <Input required id="name" placeholder="Razão Social "></Input>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="contact">Contato*</label>
                                                        <Input required id="contact" placeholder="+00 00 0000-0000"></Input>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="status">Status*</label>
                                                        <ComboBoxLayout></ComboBoxLayout>
                                                    </div>

                                                    <div className="flex justify-end">
                                                        <Button className={"w-fit"} >Cadastrar Empresa</Button>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    } ></DialogLayout>
                            </div>
                        } />
                </section>
            </section>
        </>
    )
}