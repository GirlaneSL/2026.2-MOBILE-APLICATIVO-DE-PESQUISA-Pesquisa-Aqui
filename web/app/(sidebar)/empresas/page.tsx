'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import DialogLayout from "@/components/ui/dialogLayout";
import { createCompany } from "@/lib/company";
import { SubmitEventHandler, useEffect, useState } from "react";
import InfoCard from "../(home)/components/infoCards";
import { jwtDecode } from "jwt-decode";

import { usuario } from "@/usuarios";
import { Chart } from "../(home)/components/grafico";
import Tabela from "../(home)/components/tabela";
import CadastrarAdministradorForm from "./components/CadastrarAdministradorForm";
import CadastrarEmpresaForm from "./components/CadastrarEmpresaForm";

export default function EmpresaPage() {
    const [legalName, setLegalName] = useState('');
    const [contact, setContact] = useState('');
    const [situation, setSituation] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const token = localStorage.getItem('access_token');

        if (token) {
            try {
                const decodificated = jwtDecode(token);
                setUser(decodificated)
            } catch (error) {
                console.log('Invalid token');
            }
        }
    }, [])

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


const columns = [
    { key: "nome", label: "Pesquisa" },
    { key: "status", label: "Status" },
    { key: "respostas", label: "Respostas" },
    { key: "data", label: "Data" },
] as const;

const pesquisas = [
    { nome: "Pesquisa de satisfação", status: "Ativa", respostas: 120, data: "02/09/2026" },
    { nome: "Pesquisa de produto1", status: "Encerrada", respostas: 85, data: "01/09/2026" },
    { nome: "Pesquisa de produto2", status: "Ativa", respostas: 85, data: "01/09/2026" },
    { nome: "Pesquisa de produto3", status: "Encerrada", respostas: 85, data: "01/09/2026" },
];

    return (
        <>
            <section className="flex flex-col gap-5">
                <BannerComponent title="Dados das Empresas" />

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                    {user?.profile === 'SUPERADMINISTRATOR' && (

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
                                                    <CadastrarAdministradorForm />
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
                                                    <CadastrarEmpresaForm />
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
                                    <Tabela columns={columns} data={pesquisas} />
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
                                <div className="flex justify-center col-span-10 ">
                                    <div className="w-90"><Chart variant="bar" /></div>
                                </div>
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
                                    <div className="flex justify-center col-span-10 ">
                                        <div className="w-90"><Chart variant="line" /></div>
                                    </div>
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