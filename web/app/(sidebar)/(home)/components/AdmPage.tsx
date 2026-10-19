'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { Pin } from "@/components/ui/contour";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isSessionExpiredError } from "@/lib/apiFetcher";
import { buildAdminActivities, countByMonth } from "@/lib/dashboard";
import { getActiveResearchesInMonth, getResearches, getResearchesByMonth, type Research } from "@/lib/research";
import { getResearchers, type UserItem } from "@/lib/user";
import { ClipboardList, Clock, History, Target, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ListaPesquisadores from "../../pesquisadores/components/ListaPesquisadores";
import TabelaPesquisas from "../../pesquisas/components/TabelaPesquisas";
import AreaPanel from "./AreaPanel";
import { firstName, greetingFor, monthName, PIN_SLOTS, todayLabel } from "./dashboardUtils";
import HeroPanel from "./HeroPanel";
import InfoCard from "./infoCards";
import StatusPanel from "./StatusPanel";
import UltimasAtualizacoesList from "./UltimasAtualizacoesList";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AdmPage({ userName }: { userName?: string }) {
    const [researches, setResearches] = useState<Research[]>([]);
    const [researchers, setResearchers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getResearches(), getResearchers()])
            .then(([researchesData, researchersData]) => {
                if (cancelled) return;
                setResearches(researchesData ?? []);
                setResearchers(researchersData ?? []);
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
    const month = today.getMonth() + 1;

    const activeThisMonth = useMemo(() => getActiveResearchesInMonth(researches, month, year), [researches, month, year]);
    const activePrevMonth = useMemo(
        () => getActiveResearchesInMonth(researches, month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year),
        [researches, month, year]
    );

    const researchesChart = useMemo(
        () => getResearchesByMonth(researches, year).map((p) => ({ label: p.month, value: p.Pesquisas })),
        [researches, year]
    );

    const researchersChart = useMemo(
        () => countByMonth(researchers, (r) => r.createdAt, year, 'Pesquisadores').map((p) => ({ label: p.month, value: Number(p.Pesquisadores) })),
        [researchers, year]
    );

    const activities = useMemo(
        () => buildAdminActivities(researches, researchers),
        [researches, researchers]
    );

    const byStatus = useMemo(() => {
        const count = (status: Research["status"]) => researches.filter((r) => r.status === status).length;
        return { draft: count("DRAFT"), published: count("PUBLISHED"), inField: count("IN_FIELD"), closed: count("CLOSED") };
    }, [researches]);

    const pins = useMemo(
        () =>
            [...activeThisMonth]
                .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
                .slice(0, PIN_SLOTS.length)
                .map((r, i) => {
                    const daysLeft = Math.ceil((new Date(r.endDate).getTime() - today.getTime()) / DAY_MS);
                    return { id: r.id, label: r.title, daysLeft, slot: PIN_SLOTS[i] };
                }),
        [activeThisMonth, today]
    );

    const diff = activeThisMonth.length - activePrevMonth.length;
    const previousMonthName = monthName(month - 2);
    const delta = loading || diff === 0
        ? undefined
        : `${Math.abs(diff)} ${diff > 0 ? "a mais" : "a menos"} que em ${previousMonthName}`;

    const dash = loading ? "–" : undefined;

    return (
        <>
            <BannerComponent
                title="Painel de dados"
                description={todayLabel(today)}
                actions={<Link href="/pesquisas" className={buttonVariants({ size: "sm" })}>Nova pesquisa</Link>}
            />

            <HeroPanel
                greeting={`${greetingFor(today)}${userName ? `, ${firstName(userName)}` : ""}. Neste mês:`}
                value={dash ?? activeThisMonth.length}
                caption={activeThisMonth.length === 1 ? "pesquisa ativa" : "pesquisas ativas"}
                delta={delta}
                minis={[
                    { value: dash ?? researches.length, label: "pesquisas no total" },
                    { value: dash ?? researchers.length, label: "pesquisadores" },
                    { value: dash ?? byStatus.inField, label: "em campo agora" },
                ]}
            >
                {!loading && pins.length === 0 && (
                    <p className="pa-empty absolute inset-0 z-2 px-10 text-[#8ea398]">
                        Nenhuma pesquisa ativa neste mês. Publique uma para ver os pontos de campo aqui.
                    </p>
                )}
                {pins.map(({ id, label, daysLeft, slot }) => (
                    <Pin
                        key={id}
                        label={label}
                        value={daysLeft >= 0 ? `${daysLeft} d` : undefined}
                        left={slot.left}
                        top={slot.top}
                        delay={slot.delay}
                        tone={daysLeft <= 7 ? "clay" : "mint"}
                    />
                ))}
            </HeroPanel>

            <section className="pa-bento">
                <AreaPanel
                    cardClassName="pa-c8"
                    icon={<ClipboardList />}
                    title="Pesquisas ativas por mês"
                    description="Passe o mouse sobre o gráfico para ver cada mês"
                    data={researchesChart}
                    unit="pesquisas ativas"
                    currentMonth={month - 1}
                />

                <StatusPanel
                    cardClassName="pa-c4"
                    icon={<Target />}
                    title="Situação das pesquisas"
                    description="Como estão todas as pesquisas da empresa"
                    highlighted={byStatus.published + byStatus.inField}
                    total={researches.length}
                    caption="publicadas ou em campo"
                    rows={[
                        { label: "Em campo", count: byStatus.inField },
                        { label: "Publicadas", count: byStatus.published },
                        { label: "Rascunhos", count: byStatus.draft, tone: "clay" },
                        { label: "Encerradas", count: byStatus.closed },
                    ]}
                />

                <InfoCard
                    cardClassName="pa-c4"
                    tone="dark"
                    icon={<History />}
                    cardTitle="Atividade recente"
                    cardDescription="O que mudou nas pesquisas e na equipe"
                    contour={{ seed: 2.8, rings: 10, cx: 0.1, cy: 1.0, size: 1.1, width: 400, height: 520 }}
                    cardContent={<UltimasAtualizacoesList items={activities} loading={loading} />}
                />

                <AreaPanel
                    cardClassName="pa-c8"
                    icon={<UsersRound />}
                    title="Pesquisadores cadastrados por mês"
                    data={researchersChart}
                    unit="novos pesquisadores"
                    currentMonth={month - 1}
                />

                <InfoCard
                    cardClassName="pa-c12"
                    icon={<Clock />}
                    cardTitle="Pesquisas e equipe"
                    cardDescription="Situação, período e quem coleta em cada pesquisa"
                    CardContentClassName="max-h-[26rem] overflow-auto"
                    cardContent={
                        <Tabs defaultValue="pesquisas" className="w-full">
                            <TabsList className="sticky top-0 z-10 grid w-fit grid-cols-2">
                                <TabsTrigger value="pesquisas">Pesquisas</TabsTrigger>
                                <TabsTrigger value="pesquisadores">Pesquisadores</TabsTrigger>
                            </TabsList>

                            <TabsContent value="pesquisas" className="pt-2">
                                <TabelaPesquisas allowActions={false} />
                            </TabsContent>

                            <TabsContent value="pesquisadores" className="pt-2">
                                <ListaPesquisadores
                                    researchers={researchers}
                                    companyNames={{}}
                                    loading={loading}
                                    canDelete={false}
                                    showCompany={false}
                                    onDeleted={() => { }}
                                    maxHeightClassName="max-h-none"
                                />
                            </TabsContent>
                        </Tabs>
                    }
                />
            </section>
        </>
    );
}
