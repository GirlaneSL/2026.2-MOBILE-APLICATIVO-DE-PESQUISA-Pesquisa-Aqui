'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { Button } from "@/components/ui/button";
import { ComboBoxLayout } from "@/components/ui/comboboxLayout";
import DialogLayout from "@/components/ui/dialogLayout";
import { Input } from "@/components/ui/input";
import { SubmitEventHandler, useState } from "react";
import InfoCard from "../(home)/components/infoCards";


import { usuario } from "@/usuarios";


export default function PesquisadoresPage() {
    const [Nome, setNome] = useState('');
    const [Usuario, setUsuario] = useState('');
    const [Empresa, setEmpresa] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        if (!Empresa) {
            alert("Selecione uma situação");
            return;
        }

        try {

        } catch (error) {

        }
    };

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
                                                                    value={Nome}
                                                                    onChange={(e) =>
                                                                        setNome(e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <label htmlFor="user">
                                                                    Usuario*
                                                                </label>

                                                                <Input
                                                                    required
                                                                    id="user"
                                                                    placeholder="Joãozinho"
                                                                    value={Usuario}
                                                                    onChange={(e) =>
                                                                        setUsuario(e.target.value)
                                                                    }
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor="perfil">
                                                                    Perfil*
                                                                </label>

                                                                <Input
                                                                    required
                                                                    id="perfil"
                                                                    placeholder="Perfil"
                                                                    value={Usuario}
                                                                    onChange={(e) =>
                                                                        setUsuario(e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <label htmlFor="password">
                                                                    Senha*
                                                                </label>

                                                                <Input
                                                                    required
                                                                    id="password"
                                                                    placeholder="123456"
                                                                    value={Usuario}
                                                                    onChange={(e) =>
                                                                        setUsuario(e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <label htmlFor="situation">
                                                                    Empresa que Pertence*
                                                                </label>

                                                                <ComboBoxLayout
                                                                    value={Empresa}
                                                                    onValueChange={setEmpresa}
                                                                />
                                                            </div>

                                                            <div className="flex justify-end">

                                                                <Button
                                                                    type="submit"
                                                                    className="w-fit verde"
                                                                >
                                                                    Cadastrar Pesquisador
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
                    <InfoCard cardTitle="" cardClassName="col-span-1 md:col-span-1 lg:col-span-1" />
                    <InfoCard cardClassName=" col-span-1 md:col-span-2 lg:col-span-1" />
                </section>
                <section className="grid grid-cols-5 gap-5 md:col-span-2">
                    <InfoCard cardClassName="col-span-5 md:col-span-3 lg:col-span-3" />
                    <InfoCard cardClassName="col-span-5 md:col-span-2 lg:col-span-2" />
                </section>
            </section>
        </>
    );
}