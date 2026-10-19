'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import DialogLayout from "@/components/ui/dialogLayout";
import { Button } from "@/components/ui/button";
import { isSessionExpiredError } from "@/lib/apiFetcher";
import { getCompanies, type CompanyItem } from "@/lib/company";
import { countByMonth } from "@/lib/dashboard";
import { getUsersAdmin, type UserItem } from "@/lib/user";
import { Building2, Plus, RefreshCw, UserPlus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import InfoCard from "../(home)/components/infoCards";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { Chart } from "../(home)/components/grafico";
import CadastrarAdministradorForm from "./components/CadastrarAdministradorForm";
import CadastrarEmpresaForm from "./components/CadastrarEmpresaForm";
import ExibirEditar from "./components/ExibirExcluir";

export default function EmpresaPage() {
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

    return (
        <section className="flex flex-col gap-5">
            <BannerComponent
                title="Empresas"
                description="Cadastre empresas e os administradores que respondem por elas."
                actions={
                    isSuperAdmin && (
                        <>
                            <DialogLayout
                                triggerButtonVariant="outline"
                                triggerButtonSize="sm"
                                dialogTrigger={<><UserPlus />Novo administrador</>}
                                dialogTitle="Novo administrador"
                                dialogDescription="Informe os dados de acesso do administrador."
                                dialogContent={<CadastrarAdministradorForm />}
                            />
                            <DialogLayout
                                triggerButtonSize="sm"
                                dialogTrigger={<><Plus />Nova empresa</>}
                                dialogTitle="Nova empresa"
                                dialogDescription="Informe os dados da empresa."
                                dialogContent={<CadastrarEmpresaForm />}
                            />
                        </>
                    )
                }
            />

            <section className="pa-bento" style={{ marginTop: 0 }}>
                <InfoCard
                    cardClassName="pa-c8"
                    animationDelayN={2}
                    icon={<Building2 />}
                    cardTitle="Empresas e administradores"
                    cardDescription="Alterne entre as duas listas para editar ou excluir."
                    cardAction={
                        <Button variant="outline" size="sm" onClick={reloadData} disabled={loadingData}>
                            <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
                            Atualizar
                        </Button>
                    }
                    CardContentClassName="max-h-[34rem] overflow-auto"
                    cardContent={<ExibirEditar key={reloadKey} />}
                />

                <div className="pa-c4 flex flex-col gap-4">
                    <InfoCard
                        animationDelayN={3}
                        tone="mint"
                        icon={<UsersRound />}
                        cardTitle="Administradores"
                        cardDescription={`Cadastros em ${year}`}
                        cardContent={
                            <Chart variant="bar" data={adminsChart} seriesKey="Administradores" seriesLabel="Administradores cadastrados" />
                        }
                    />
                    <InfoCard
                        animationDelayN={4}
                        icon={<Building2 />}
                        cardTitle="Empresas"
                        cardDescription={`Cadastros em ${year}`}
                        cardContent={
                            <Chart variant="bar" data={companiesChart} seriesKey="Empresas" seriesLabel="Empresas cadastradas" />
                        }
                    />
                </div>
            </section>
        </section>
    );
}
