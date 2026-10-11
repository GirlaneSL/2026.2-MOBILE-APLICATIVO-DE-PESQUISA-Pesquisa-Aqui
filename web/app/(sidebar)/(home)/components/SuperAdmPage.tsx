'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { Spinner } from "@/components/ui/spinner";
import { isSessionExpiredError } from "@/lib/apiFetcher";
import { getCompanies, type CompanyItem } from "@/lib/company";
import { buildSuperAdminActivities, countByMonth } from "@/lib/dashboard";
import { getUsersAdmin, type UserItem } from "@/lib/user";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ExibirEditar from "../../empresas/components/ExibirExcluir";
import EstatisticasChart from "../components/EstatisticasChart";
import InfoCard from "../components/infoCards";
import UltimasAtualizacoesList from "../components/UltimasAtualizacoesList";

export default function SuperAdmPage() {

    const [companies, setCompanies] = useState<CompanyItem[]>([])
    const [admins, setAdmins] = useState<UserItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
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
                toast.error('Erro ao carregar dados do painel');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [])

    const [year] = useState(() => new Date().getFullYear());

    const activeCompanies = useMemo(
        () => companies.filter((c) => c.situation === 'ACTIVE'),
        [companies]
    );

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

    const statValue = (n: number) => (loading ? <Spinner className="size-8" /> : n);

    return (
        <section className="relative min-h-screen flex flex-col gap-5">
            <BannerComponent title="Painel de Dados" />

            <section className="flex flex-col gap-5 max-lg:gap-4 ">
                <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-1 max-lg:gap-4">
                    <InfoCard
                        cardClassName=" shadow-md introduction-card"
                        animationDelayN={2}
                        isCardFooter={false}
                        cardTitle="Empresas Ativas"
                        cardContent={
                            <EstatisticasChart
                                valor={statValue(activeCompanies.length)}
                                chartData={companiesChart}
                                seriesKey="Empresas"
                                seriesLabel="Empresas cadastradas"
                                variant="bar"
                            />
                        }
                    />

                    <InfoCard
                        cardClassName="shadow-md"
                        animationDelayN={3}
                        isCardFooter={false}
                        cardTitle="Administradores Ativos"
                        cardContent={
                            <EstatisticasChart
                                valor={statValue(admins.length)}
                                chartData={adminsChart}
                                seriesKey="Administradores"
                                seriesLabel="Administradores cadastrados"
                                variant="bar"
                            />
                        }
                    />

                    <InfoCard
                        cardClassName=" shadow-md introduction-card"
                        animationDelayN={4}
                        isCardFooter={false}
                        cardTitle="Ultimas Atualizações"
                        cardContent={<UltimasAtualizacoesList items={activities} loading={loading} />}
                    />
                </div>

                <div className="grid grid-cols-5 gap-5 max-lg:grid-cols-1 max-lg:gap-4">
                    <InfoCard
                        cardClassName="shadow-md col-span-5 "
                        animationDelayN={5}
                        isCardFooter={false}
                        cardTitle="Empresas / Administradores"
                        CardContentClassName={"max-h-50 overflow-auto"}
                        cardContent={
                            <div className="flex flex-col gap-2 ">
                                <ExibirEditar allowActions={false} />
                            </div>
                        }
                    />
                </div>
            </section>
        </section>
    );
}
