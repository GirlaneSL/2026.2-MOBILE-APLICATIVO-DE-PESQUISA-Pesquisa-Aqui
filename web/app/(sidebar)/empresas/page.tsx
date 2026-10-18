'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import DialogLayout from "@/components/ui/dialogLayout";
import { Button } from "@/components/ui/button";
import { isSessionExpiredError } from "@/lib/apiFetcher";
import { createCompany, getCompanies, type CompanyItem } from "@/lib/company";
import { buildSuperAdminActivities, countByMonth } from "@/lib/dashboard";
import { getUsersAdmin, type UserItem } from "@/lib/user";
import { RefreshCw } from "lucide-react";
import { SubmitEventHandler, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import InfoCard from "../(home)/components/infoCards";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { Chart } from "../(home)/components/grafico";
import UltimasAtualizacoesList from "../(home)/components/UltimasAtualizacoesList";
import CadastrarAdministradorForm from "./components/CadastrarAdministradorForm";
import CadastrarEmpresaForm from "./components/CadastrarEmpresaForm";
import ExibirEditar from "./components/ExibirExcluir";

export default function EmpresaPage() {
    const [legalName, setLegalName] = useState('');
    const [contact, setContact] = useState('');
    const [situation, setSituation] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
    const { user } = useCurrentUser();
    const isSuperAdmin = user?.profile === 'SUPERADMINISTRATOR';

    const [companies, setCompanies] = useState<CompanyItem[]>([]);
    const [admins, setAdmins] = useState<UserItem[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    const reloadData = useCallback(() => {
        setLoadingData(true);
        setReloadKey((k) => k + 1);
    }, []);

    useEffect(() => {
        if (!isSuperAdmin) return;

        let cancelled = false;

        Promise.all([getCompanies(), getUsersAdmin()])
            .then(([companiesData, adminsData]) => {
                if (cancelled) return;
                setCompanies(companiesData ?? []);
                setAdmins(adminsData ?? []);
            })
            .catch((error) => {
                if (cancelled || isSessionExpiredError(error)) return;
                console.error(error);
                toast.error('Erro ao carregar dados das empresas');
            })
            .finally(() => {
                if (!cancelled) setLoadingData(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isSuperAdmin, reloadKey]);

    const [year] = useState(() => new Date().getFullYear());

    const companiesChart = useMemo(
        () => countByMonth(companies, (c) => c.createdAt, year, 'Empresas'),
        [companies, year]
    );

    const adminsChart = useMemo(
        () => countByMonth(admins, (a) => a.createdAt, year, 'Administradores'),
        [admins, year]
    );

    const activities = useMemo(
        () => buildSuperAdminActivities(companies, admins),
        [companies, admins]
    );

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

                    {user?.profile === 'SUPERADMINISTRATOR' && (
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
                                        dialogTitle="Painel Geral"
                                        dialogDescription="Alterne entre as listagens de Empresas e Administradores"
                                        dialogContent={
                                            <ExibirEditar></ExibirEditar>
                                        }
                                    />
                                </div>
                            </div>
                        }
                    />
                </section>

                <section className="grid grid-cols-5 gap-5 row-span-2 md:grid-cols-2 lg:grid-cols-5">
                    <InfoCard
                        cardTitle="Empresas / Administradores"
                        animationDelayN={5}
                        cardClassName="row-span-1 max-h-100 min-h-75 overflow-auto col-span-5 md:col-span-2 lg:col-span-3"
                        isCardFooter={false}
                        CardContentClassName={"max-h-100 overflow-auto"}
                        cardContent={
                            <>
                                <div className="">
                                    <ExibirEditar allowActions={false}></ExibirEditar>
                                </div>
                            </>
                        }
                    />
                    <InfoCard
                        cardTitle="Administradores"
                        animationDelayN={5}
                        cardClassName="col-span-5 md:col-span-1 lg:col-span-1"
                        isCardFooter={false}
                        cardContent={
                            <div className="max-h-100 overflow-auto  grid grid-cols-12 ">
                                <div className="col-span-1"></div>
                                <div className="flex justify-center col-span-10 ">
                                    <div className="w-90"><Chart variant="bar" data={adminsChart} seriesKey="Administradores" seriesLabel="Administradores cadastrados" /></div>
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
                                <div className="max-h-100 overflow-auto grid grid-cols-12 ">
                                    <div className="col-span-1"></div>
                                    <div className="flex justify-center col-span-10 ">
                                        <div className="w-90"><Chart variant="bar" data={companiesChart} seriesKey="Empresas" seriesLabel="Empresas cadastradas" /></div>
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