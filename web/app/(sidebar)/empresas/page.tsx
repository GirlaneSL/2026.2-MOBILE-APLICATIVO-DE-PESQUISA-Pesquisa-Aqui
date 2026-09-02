import { Button } from "@/components/ui/button";
import InfoCard from "../(home)/components/infoCards";
import DialogLayout from "@/components/ui/dialogLayout";
import { Input } from "@/components/ui/input";
import { ComboBoxLayout } from "@/components/ui/comboboxLayout";




export default function EmpresaPage() {
    return (
        <>
            <section>
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
                                                <div className="flex flex-col gap-2">
                                                    <label htmlFor="name">Nome da Empresa*</label>
                                                    <Input required id="name" placeholder="Razão Social "></Input>
                                                    <label htmlFor="contact">Contato*</label>
                                                    <Input required id="contact" placeholder="+00 00 0000-0000"></Input>
                                                    <label  htmlFor="status">Status*</label>
                                                    <ComboBoxLayout></ComboBoxLayout>

                                                    <Button variant={"outline"}>Cadastrar Empresa</Button>
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