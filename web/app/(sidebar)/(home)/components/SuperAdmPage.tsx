'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { Pin } from "@/components/ui/contour";
import { buttonVariants } from "@/components/ui/button";
import { isSessionExpiredError } from "@/lib/apiFetcher";
import { getCompanies, type CompanyItem } from "@/lib/company";
import { buildSuperAdminActivities, countByMonth } from "@/lib/dashboard";
import { getUsersAdmin, type UserItem } from "@/lib/user";
import { Building2, Building, History, UserCog } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ExibirEditar from "../../empresas/components/ExibirExcluir";
import AreaPanel from "./AreaPanel";
import { firstName, greetingFor, monthName, PIN_SLOTS, todayLabel } from "./dashboardUtils";
import HeroPanel from "./HeroPanel";
import InfoCard from "./infoCards";
import StatusPanel from "./StatusPanel";
import UltimasAtualizacoesList from "./UltimasAtualizacoesList";

export default function SuperAdmPage({ userName }: { userName?: string }) {
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

    const [today] = useState(() => new Date());
    const year = today.getFullYear();
    const month = today.getMonth();

    const activeCompanies = useMemo(() => companies.filter((c) => c.situation === 'ACTIVE'), [companies]);

    const companiesChart = useMemo(
        () => countByMonth(companies, (c) => c.createdAt, year, 'Empresas').map((p) => ({ label: p.month, value: Number(p.Empresas) })),
        [companies, year]
    );

    const adminsChart = useMemo(
        () => countByMonth(admins, (a) => a.createdAt, year, 'Administradores').map((p) => ({ label: p.month, value: Number(p.Administradores) })),
        [admins, year]
    );

    const activities = useMemo(() => buildSuperAdminActivities(companies, admins), [companies, admins]);

    const newThisMonth = companiesChart[month]?.value ?? 0;

    const pins = useMemo(
        () =>
            [...companies]
                .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
                .slice(0, PIN_SLOTS.length)
                .map((c, i) => ({ id: c.id, label: c.legalName, inactive: c.situation !== 'ACTIVE', slot: PIN_SLOTS[i] })),
        [companies]
    );

    const dash = loading ? "–" : undefined;

    return (
        <>
            <BannerComponent
                title="Painel de dados"
                description={todayLabel(today)}
                actions={<Link href="/empresas" className={buttonVariants({ size: "sm" })}>Nova empresa</Link>}
            />

            <HeroPanel
                greeting={`${greetingFor(today)}${userName ? `, ${firstName(userName)}` : ""}. Agora:`}
                value={dash ?? activeCompanies.length}
                caption={activeCompanies.length === 1 ? "empresa ativa" : "empresas ativas"}
                delta={!loading && newThisMonth > 0 ? `${newThisMonth} ${newThisMonth === 1 ? "nova" : "novas"} em ${monthName(month)}` : undefined}
                minis={[
                    { value: dash ?? companies.length, label: "empresas cadastradas" },
                    { value: dash ?? admins.length, label: "administradores" },
                    { value: dash ?? companies.length - activeCompanies.length, label: "empresas inativas" },
                ]}
            >
                {!loading && pins.length === 0 && (
                    <p className="pa-empty absolute inset-0 z-2 px-10 text-[#8ea398]">
                        Nenhuma empresa cadastrada ainda. Cadastre a primeira para vê-la aqui.
                    </p>
                )}
                {pins.map(({ id, label, inactive, slot }) => (
                    <Pin key={id} label={label} left={slot.left} top={slot.top} delay={slot.delay} tone={inactive ? "clay" : "mint"} />
                ))}
            </HeroPanel>

            <section className="pa-bento">
                <AreaPanel
                    cardClassName="pa-c8"
                    icon={<Building2 />}
                    title="Empresas cadastradas por mês"
                    description="Passe o mouse sobre o gráfico para ver cada mês"
                    data={companiesChart}
                    unit="novas empresas"
                    currentMonth={month}
                />

                <StatusPanel
                    cardClassName="pa-c4"
                    icon={<Building />}
                    title="Situação das empresas"
                    description="Empresas que podem entrar no sistema"
                    highlighted={activeCompanies.length}
                    total={companies.length}
                    caption="empresas ativas"
                    rows={[
                        { label: "Ativas", count: activeCompanies.length },
                        { label: "Inativas", count: companies.length - activeCompanies.length, tone: "clay" },
                    ]}
                />

                <InfoCard
                    cardClassName="pa-c4"
                    tone="dark"
                    icon={<History />}
                    cardTitle="Atividade recente"
                    cardDescription="O que mudou nas empresas e administradores"
                    contour={{ seed: 2.8, rings: 10, cx: 0.1, cy: 1.0, size: 1.1, width: 400, height: 520 }}
                    cardContent={<UltimasAtualizacoesList items={activities} loading={loading} />}
                />

                <AreaPanel
                    cardClassName="pa-c8"
                    icon={<UserCog />}
                    title="Administradores cadastrados por mês"
                    data={adminsChart}
                    unit="novos administradores"
                    currentMonth={month}
                />

                <InfoCard
                    cardClassName="pa-c12"
                    icon={<Building2 />}
                    cardTitle="Empresas e administradores"
                    cardDescription="Quem tem acesso e em que situação"
                    CardContentClassName="max-h-[26rem] overflow-auto"
                    cardContent={<ExibirEditar allowActions={false} />}
                />
            </section>
        </>
    );
}
