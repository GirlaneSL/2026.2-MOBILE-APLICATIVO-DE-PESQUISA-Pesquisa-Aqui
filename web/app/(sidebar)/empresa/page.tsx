'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { Button } from "@/components/ui/button";
import DialogLayout from "@/components/ui/dialogLayout";
import { Input } from "@/components/ui/input";
import InfoCard from "../(home)/components/infoCards";

export default function EmpresaPage() {
    return (
        <>
            <section className="flex flex-col gap-5">

                <BannerComponent title="Dados das Empresa" />

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
                                                <form
                                                // onSubmit={handleSubmit}
                                                >

                                                    <div className="flex flex-col gap-5">

                                                        <div>
                                                            <label htmlFor="title">
                                                                Titulo*
                                                            </label>

                                                            <Input
                                                                required
                                                                id="title"
                                                                placeholder="Pesquisa Exemplo"
                                                            // value={legalName}
                                                            // onChange={(e) =>
                                                            //     setLegalName(e.target.value)
                                                            // }
                                                            />
                                                        </div>

                                                        <div>
                                                            <label htmlFor="desc">
                                                                Descrição*
                                                            </label>

                                                            <Input
                                                                type="text"
                                                                required
                                                                id="desc"
                                                                placeholder="Descrição exemplo"
                                                            // value={contact}
                                                            // onChange={(e) =>
                                                            //     setContact(e.target.value)
                                                            // }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="Ob">
                                                                Objetivo*
                                                            </label>

                                                            <Input
                                                                type="text"
                                                                required
                                                                id="Ob"
                                                                placeholder="Objetivo exemplo"
                                                            // value={contact}
                                                            // onChange={(e) =>
                                                            //     setContact(e.target.value)
                                                            // }
                                                            />
                                                        </div>

                                                        <div>
                                                            <label htmlFor="Vigência">
                                                                Vigência*
                                                            </label>

                                                            <Input
                                                                type="text"
                                                                required
                                                                id="Vigência"
                                                                placeholder="Objetivo Exemplo"
                                                            // value={contact}
                                                            // onChange={(e) =>
                                                            //     setContact(e.target.value)
                                                            // }
                                                            />
                                                        </div>

                                                        <div>
                                                            <label htmlFor="Público">
                                                                Público Alvo*
                                                            </label>

                                                            <Input
                                                                type="text"
                                                                required
                                                                id="Público"
                                                                placeholder="Público Alvo Exemplo"
                                                            // value={contact}
                                                            // onChange={(e) =>
                                                            //     setContact(e.target.value)
                                                            // }
                                                            />
                                                        </div>

                                                        <div className="flex justify-end">

                                                            <Button
                                                                type="submit"
                                                                className="w-fit verde"
                                                            >
                                                                Cadastrar Pesquisa
                                                            </Button>

                                                        </div>

                                                    </div>

                                                </form>
                                            </div>
                                        }
                                    />

                                </div>
                            </>
                        }
                    />
                    <InfoCard cardTitle="" cardClassName="col-span-1 md:col-span-1 lg:col-span-1" />
                    <InfoCard cardClassName=" col-span-1 md:col-span-3 lg:col-span-1" />
                </section>
                <section className="grid grid-cols-5 gap-5 md:col-span-2">
                    <InfoCard cardClassName="col-span-5 md:col-span-3 lg:col-span-3" />
                    <InfoCard cardClassName="col-span-5 md:col-span-2 lg:col-span-2" />
                </section>

            </section>
        </>
    );
}