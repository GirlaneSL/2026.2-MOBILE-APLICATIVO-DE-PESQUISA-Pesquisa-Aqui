'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import DialogLayout from "@/components/ui/dialogLayout";
import { Button } from "@/components/ui/button";
import { isSessionExpiredError } from "@/lib/apiFetcher";
import { getCompanies, type CompanyItem } from "@/lib/company";
import { countByMonth } from "@/lib/dashboard";
import { getUsersAdmin, type UserItem } from "@/lib/user";
import { Building2, Plus, PowerOff, RefreshCw, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import InfoCard from "../(home)/components/infoCards";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { Spinner } from "@/components/ui/spinner";
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

    const stats = useMemo(() => {
        const active = companies.filter((c) => c.situation === 'ACTIVE').length;
        return {
            total: companies.length,
            active,
            inactive: companies.length - active,
            admins: admins.length,
            activePct: companies.length ? Math.round((active / companies.length) * 100) : 0,
            perCompany: companies.length ? (admins.length / companies.length).toFixed(1).replace('.', ',') : '0',
        };
    }, [companies, admins]);

    const val = (n: number) => (loadingData ? <Spinner className="size-6" /> : n);

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

            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                    animationDelayN={1}
                    tone="dark"
                    contour={{ seed: 3, rings: 11, cx: 0.9, cy: 0.25, size: 0.9 }}
                    icon={<Building2 />}
                    cardTitle="Empresas"
                    cardDescription="Cadastradas na plataforma"
                    cardContent={<p className="pa-stat text-[var(--fg-dark)]">{val(stats.total)}</p>}
                />
                <InfoCard
                    animationDelayN={2}
                    tone="mint"
                    icon={<ShieldCheck />}
                    cardTitle="Ativas"
                    cardDescription="Equipes liberadas para coletar"
                    cardContent={
                        <div className="flex flex-col gap-3">
                            <p className="pa-stat">{val(stats.active)}</p>
                            <div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/60">
                                    <div
                                        className="h-full rounded-full bg-[var(--green-deep)] transition-all duration-700"
                                        style={{ width: `${loadingData ? 0 : stats.activePct}%` }}
                                    />
                                </div>
                                <p className="mt-1.5 text-xs font-medium text-[var(--green-deep)]">
                                    {loadingData ? '…' : `${stats.activePct}% do total`}
                                </p>
                            </div>
                        </div>
                    }
                />
                <InfoCard
                    animationDelayN={3}
                    icon={<PowerOff />}
                    cardTitle="Inativas"
                    cardDescription="Acesso bloqueado ao aplicativo"
                    cardContent={
                        <div className="flex flex-col gap-3">
                            <p className="pa-stat text-[var(--clay-ink)]">{val(stats.inactive)}</p>
                            <p className="text-xs text-muted-foreground">
                                {!loadingData && stats.inactive === 0 ? 'Tudo em dia por aqui.' : 'Reative falando com o suporte.'}
                            </p>
                        </div>
                    }
                />
                <InfoCard
                    animationDelayN={4}
                    icon={<UsersRound />}
                    cardTitle="Administradores"
                    cardDescription="Respondem pelas empresas"
                    cardContent={
                        <div className="flex flex-col gap-3">
                            <p className="pa-stat">{val(stats.admins)}</p>
                            <p className="text-xs text-muted-foreground">
                                {loadingData ? '…' : `${stats.perCompany} por empresa, em média`}
                            </p>
                        </div>
                    }
                />
            </section>

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
