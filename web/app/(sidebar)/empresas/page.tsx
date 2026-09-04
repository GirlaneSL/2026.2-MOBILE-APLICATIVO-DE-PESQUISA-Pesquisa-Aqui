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
                            cardContent={
                                <div className="flex justify-end">

                                    <DialogLayout
                                        triggerButtonVariant="outline"
                                        dialogTrigger="Cadastrar"
                                        dialogTitle="Cadastramento de Administrador"
                                        dialogDescription="Informe os Dados do Administrador"

                                        dialogContent={
                                            <div>
                                                <form onSubmit={handleSubmit}>

                                                    <div className="flex flex-col gap-5">

                                                        {/* Nome da empresa */}
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

                                                        {/* Contato */}
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

                                                        {/* Situação */}
                                                        <div>
                                                            <label htmlFor="Empresa">
                                                                Empresa*
                                                            </label>

                                                            <ComboBoxLayout
                                                                value={situation}
                                                                onValueChange={setSituation}
                                                            />
                                                        </div>

                                                        {/* Botão */}
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
                            }
                        />
                    )}

                    {usuario.profile === 'SUPERADMINISTRATOR' && (

                        <InfoCard
                            isCardFooter={false}
                            animationDelayN={2}
                            cardTitle="Cadastrar Empresa"
                            cardDescription="Cadastre Uma Nova Empresa"
                            cardContent={
                                <div className="flex justify-end">

                                    <DialogLayout
                                        triggerButtonVariant="outline"
                                        dialogTrigger="Cadastrar"
                                        dialogTitle="Cadastramento de Empresas"
                                        dialogDescription="Informe os Dados da Empresa"

                                        dialogContent={
                                            <div>
                                                <form onSubmit={handleSubmit}>

                                                    <div className="flex flex-col gap-5">

                                                        {/* Nome da empresa */}
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

                                                        {/* Contato */}
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

                                                        {/* Situação */}
                                                        <div>
                                                            <label htmlFor="situation">
                                                                Situação*
                                                            </label>

                                                            <ComboBoxLayout
                                                                value={situation}
                                                                onValueChange={setSituation}
                                                            />
                                                        </div>

                                                        {/* Botão */}
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
                            }
                        />
                    )}

                </section>

            </section>
        </>
    );
}