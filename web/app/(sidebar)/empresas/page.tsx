'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { Button } from "@/components/ui/button";
import { ComboBoxLayout } from "@/components/ui/comboboxLayout";
import DialogLayout from "@/components/ui/dialogLayout";
import { Input } from "@/components/ui/input";
import { createCompany } from "@/lib/company";
import { SubmitEventHandler, useState } from "react";
import InfoCard from "../(home)/components/infoCards";


import { usuario } from "@/usuarios";
import { Chart } from "../(home)/components/grafico";
import Tabela from "../(home)/components/tabela";

const columns = [
    { key: "nome", label: "Pesquisa" },
    { key: "status", label: "Status" },
    { key: "respostas", label: "Respostas" },
    { key: "data", label: "Data" },
] as const

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
export default function EmpresaPage() {
    const [legalName, setLegalName] = useState('');
    const [contact, setContact] = useState('');
    const [situation, setSituation] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        if (!situation) {
            alert("Selecione uma situação");
            return;
        }

        try {
            await createCompany(
                legalName,
                contact,
                situation
            );

            alert("Empresa cadastrada com sucesso!");

            setLegalName('');
            setContact('');
            setSituation('');

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Erro ao cadastrar empresa");
        }
    };

    return (
        <>
            <section className="flex flex-col gap-5">

                <BannerComponent title="Dados das Empresas" />

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                    {usuario.profile === 'SUPERADMINISTRATOR' && (

                        <InfoCard
                            isCardFooter={false}
                            animationDelayN={2}
                            cardTitle="Cadastrar Administrador"
                            cardDescription="Cadastre Um Novo Administrador"
                            cardClassName={"relative"}
                            cardContent={
                                <>
                                    <br />
                                    <br />
                                    <div className="absolute bottom-5 right-5 flex justify-end ">

                                        <DialogLayout
                                            triggerButtonVariant="outline"
                                            dialogTrigger="Cadastrar"
                                            dialogTitle="Cadastramento de Administrador"
                                            dialogDescription="Informe os Dados do Administrador"

                                            dialogContent={
                                                <div>
                                                    <form onSubmit={handleSubmit}>

                                                        <div className="flex flex-col gap-5">

                                                            <div>
                                                                <label htmlFor="name">
                                                                    Nome*
                                                                </label>

                                                                <Input
                                                                    required
                                                                    id="name"
                                                                    placeholder="João"
                                                                    value={legalName}
                                                                    onChange={(e) =>
                                                                        setLegalName(e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <label htmlFor="password">
                                                                    Senha*
                                                                </label>

                                                                <Input
                                                                    type="password"
                                                                    required
                                                                    id="password"
                                                                    placeholder="123456"
                                                                    value={contact}
                                                                    onChange={(e) =>
                                                                        setContact(e.target.value)
                                                                    }
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor="Cpassword">
                                                                    Confirmar Senha*
                                                                </label>

                                                                <Input
                                                                    type="password"
                                                                    required
                                                                    id="Cpassword"
                                                                    placeholder="123456"
                                                                    value={contact}
                                                                    onChange={(e) =>
                                                                        setContact(e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <label htmlFor="Empresa">
                                                                    Empresa*
                                                                </label>

                                                                <ComboBoxLayout
                                                                    value={situation}
                                                                    onValueChange={setSituation}
                                                                />
                                                            </div>

                                                            <div className="flex justify-end">

                                                                <Button
                                                                    type="submit"
                                                                    className="w-fit verde"
                                                                >
                                                                    Cadastrar Adminstrador
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
                    )}

                    {usuario.profile === 'SUPERADMINISTRATOR' && (

                        <InfoCard
                            isCardFooter={false}
                            animationDelayN={3}
                            cardTitle="Cadastrar Empresa"
                            cardDescription="Cadastre Uma Nova Empresa"
                            cardClassName="relative"
                            cardContent={
                                <div className="">
                                    <br />
                                    <br />
                                    <div className="absolute bottom-5 right-5 flex justify-end">

                                        <DialogLayout
                                            triggerButtonVariant="outline"
                                            dialogTrigger="Cadastrar"
                                            dialogTitle="Cadastramento de Empresas"
                                            dialogDescription="Informe os Dados da Empresa"

                                            dialogContent={
                                                <div>
                                                    <form onSubmit={handleSubmit}>

                                                        <div className="flex flex-col gap-5">

                                                            <div>
                                                                <label htmlFor="name">
                                                                    Nome da Empresa*
                                                                </label>

                                                                <Input
                                                                    required
                                                                    id="name"
                                                                    placeholder="Razão Social"
                                                                    value={legalName}
                                                                    onChange={(e) =>
                                                                        setLegalName(e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <label htmlFor="contact">
                                                                    Contato*
                                                                </label>

                                                                <Input
                                                                    required
                                                                    id="contact"
                                                                    placeholder="+00 00 0000-0000"
                                                                    value={contact}
                                                                    onChange={(e) =>
                                                                        setContact(e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <label htmlFor="situation">
                                                                    Situação*
                                                                </label>

                                                                <ComboBoxLayout
                                                                    value={situation}
                                                                    onValueChange={setSituation}
                                                                />
                                                            </div>

                                                            <div className="flex justify-end">

                                                                <Button
                                                                    type="submit"
                                                                    className="w-fit verde"
                                                                >
                                                                    Cadastrar Empresa
                                                                </Button>

                                                            </div>

                                                        </div>

                                                    </form>
                                                </div>
                                            }
                                        />
                                    </div>

                                </div>
                            }
                        />
                    )}

                    <InfoCard
                        cardTitle="Edição / Exclusão"
                        cardDescription="Edite ou Exclua Um Administrador / Empresa"
                        isCardFooter={false}
                        animationDelayN={4}
                        cardClassName="relative col-span-1 md:col-span-2 lg:col-span-1"
                        cardContent={
                            <div className=" ">
                                <br />
                                <br />
                                <div className="absolute bottom-5 right-5">
                                    <DialogLayout
                                        dialogTrigger="Exibir"
                                        dialogTitle="Administradores / Empresas"
                                        dialogDescription="lista dos Administradores / Empresas"
                                    />
                                </div>
                            </div>
                        }
                    />
                </section>
                <section className="grid grid-cols-5 gap-5 row-span-2 md:grid-cols-2 lg:grid-cols-5">
                    <InfoCard
                        cardTitle="Empresas / Administradires"
                        animationDelayN={5}
                        cardClassName="row-span-1 max-h-100 overflow-auto col-span-5 md:col-span-2 lg:col-span-3"
                        isCardFooter={false}
                        cardContent={
                            <>
                                <div>
                                    <Tabela columns={columns} data={pesquisas}></Tabela>
                                </div>
                            </>
                        }
                    />
                    <InfoCard
                        cardTitle="Administradores"
                        animationDelayN={5}
                        cardClassName="max-h-100 overflow-auto col-span-5 md:col-span-1 lg:col-span-1"
                        isCardFooter={false}
                        cardContent={
                            <div className="grid grid-cols-12 ">
                                <div className="col-span-1"></div>
                                <div className="flex justify-center col-span-10 "> <div className="w-90"><Chart variant="bar"></Chart></div></div>
                                <div className="col-span-1"></div>

                            </div>
                        }
                    />
                    <InfoCard
                        cardTitle="Empresas"
                        animationDelayN={5}
                        cardClassName="col-span-5 md:col-span-1 lg:col-span-1"
                        isCardFooter={false}
                        cardContent={
                            <>
                                <div className="grid grid-cols-12 ">
                                    <div className="col-span-1"></div>
                                    <div className="flex justify-center col-span-10 "> <div className="w-90"><Chart variant="line"></Chart></div></div>
                                    <div className="col-span-1"></div>
                                </div>
                            </>
                        }
                    />
                </section>
            </section>
        </>
    );
}