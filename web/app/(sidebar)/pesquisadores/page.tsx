'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import DialogLayout from "@/components/ui/dialogLayout";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getCompanies } from "@/lib/company";
import { getResearchers, UserItem } from "@/lib/user";
import { Building2, RefreshCw, TrendingUp, UserPlus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import InfoCard from "../(home)/components/infoCards";
import CadastrarPesquisadorForm from "./components/CadastrarPesquisadorForm";
import ListaPesquisadores from "./components/ListaPesquisadores";
import { Spinner } from "@/components/ui/spinner";

const WEEKS = 8;

export default function PesquisadoresPage() {
    const { user } = useCurrentUser();
    const isSuperAdmin = user?.profile === 'SUPERADMINISTRATOR';
    const canRegister = user?.profile === 'SUPERADMINISTRATOR' || user?.profile === 'ADMINISTRATOR';

    const [researchers, setResearchers] = useState<UserItem[]>([]);
    const [companyNames, setCompanyNames] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);

    const [reloadKey, setReloadKey] = useState(0);
    const [referenceTime, setReferenceTime] = useState(0);

    const loadResearchers = useCallback(() => {
        setLoading(true);
        setReloadKey((k) => k + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;

        getResearchers()
            .then((data) => {
                if (cancelled) return;
                setResearchers(data);
                setReferenceTime(Date.now());
            })
            .catch((error) => {
                console.error(error);
                if (!cancelled) toast.error(error instanceof Error ? error.message : "Erro ao carregar pesquisadores");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    useEffect(() => {
        if (!isSuperAdmin) return;

        getCompanies()
            .then((companies: { id: number; legalName: string }[]) =>
                setCompanyNames(Object.fromEntries(companies.map((c) => [c.id, c.legalName])))
            )
            .catch((error) => console.error(error));
    }, [isSuperAdmin]);

    const handleDeleted = (username: string) =>
        setResearchers((prev) => prev.filter((r) => r.username !== username));

    const handleUpdated = (updated: UserItem) =>
        setResearchers((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));

    const stats = useMemo(() => {
        const DAY = 24 * 60 * 60 * 1000;
        const last30 = referenceTime - 30 * DAY;

        // Cadastros por semana nas últimas 8 semanas (da mais antiga para a atual).
        const weekly = Array.from({ length: WEEKS }, () => 0);
        researchers.forEach((r) => {
            const t = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
            if (Number.isNaN(t) || !referenceTime) return;
            const ago = Math.floor((referenceTime - t) / (7 * DAY));
            if (ago >= 0 && ago < WEEKS) weekly[WEEKS - 1 - ago] += 1;
        });

        return {
            total: researchers.length,
            companies: new Set(researchers.map((r) => r.companyId)).size,
            recent: researchers.filter((r) => r.createdAt && new Date(r.createdAt).getTime() >= last30).length,
            weekly,
        };
    }, [researchers, referenceTime]);

    const maxWeek = Math.max(1, ...stats.weekly);
    const recentShare = stats.total ? Math.round((stats.recent / stats.total) * 100) : 0;

    const statValue = (n: number) => (loading ? "–" : n);

    return (
        <section className="flex flex-col gap-5">
            <BannerComponent
                title="Pesquisadores"
                description={isSuperAdmin ? "Quem coleta em campo, em todas as empresas." : "Quem coleta em campo pela sua empresa."}
                actions={
                    canRegister ? (
                        <DialogLayout
                            triggerButtonSize="sm"
                            dialogTrigger={<><UserPlus />Novo pesquisador</>}
                            dialogTitle="Novo pesquisador"
                            dialogDescription="Informe os dados de acesso do pesquisador."
                            dialogContent={
                                <CadastrarPesquisadorForm
                                    isSuperAdmin={isSuperAdmin}
                                    onSuccess={loadResearchers}
                                />
                            }
                        />
                    ) : (
                        <Spinner className="size-6" />
                    )
                }
            />

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                {/* Painel principal: total + ritmo de cadastros */}
                <InfoCard
                    animationDelayN={2}
                    tone="dark"
                    cardClassName="lg:col-span-3"
                    contour={{ seed: 5, rings: 12, cx: 0.86, cy: 0.2, size: 1.15 }}
                    icon={<UsersRound />}
                    cardTitle="Pesquisadores cadastrados"
                    cardDescription={isSuperAdmin ? "Em todas as empresas" : "Na sua empresa"}
                    cardContent={
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                            <p className="pa-stat !text-[64px] text-[var(--fg-dark)]">{statValue(stats.total)}</p>

                            <div className="w-full sm:max-w-[260px]">
                                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--muted-dark)]">
                                    <TrendingUp className="size-3.5" />
                                    Cadastros por semana · últimas {WEEKS}
                                </p>
                                <div
                                    className="flex h-16 items-end gap-1.5"
                                    role="img"
                                    aria-label={`Cadastros por semana: ${stats.weekly.join(", ")}`}
                                >
                                    {stats.weekly.map((n, i) => {
                                        const isCurrent = i === WEEKS - 1;
                                        return (
                                            <div
                                                key={i}
                                                title={`${n} ${n === 1 ? "cadastro" : "cadastros"}`}
                                                className={`flex-1 rounded-t-md rounded-b-sm transition-all duration-700 ${
                                                    isCurrent ? "bg-[var(--mint)]" : "bg-[rgba(191,227,208,0.28)]"
                                                }`}
                                                style={{ height: `${Math.max(n > 0 ? 14 : 5, (n / maxWeek) * 100)}%` }}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="mt-1.5 flex justify-between text-[11px] text-[var(--muted-dark)]">
                                    <span>8 sem. atrás</span>
                                    <span>esta semana</span>
                                </div>
                            </div>
                        </div>
                    }
                />

                {/* Painel de apoio: novos / empresas */}
                <InfoCard
                    animationDelayN={3}
                    tone="mint"
                    cardClassName="lg:col-span-2"
                    contour={{ seed: 2, rings: 9, cx: 0.9, cy: 0.85, size: 1 }}
                    icon={isSuperAdmin ? <Building2 /> : <UserPlus />}
                    cardTitle={isSuperAdmin ? "Empresas com pesquisadores" : "Novos nos últimos 30 dias"}
                    cardDescription={isSuperAdmin ? "Empresas com ao menos um pesquisador" : "Cadastrados recentemente"}
                    cardContent={
                        <div className="flex flex-col gap-4">
                            <p className="pa-stat !text-[64px]">{statValue(isSuperAdmin ? stats.companies : stats.recent)}</p>

                            {!isSuperAdmin && (
                                <div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/60">
                                        <div
                                            className="h-full rounded-full bg-[var(--green-deep)] transition-all duration-700"
                                            style={{ width: `${loading ? 0 : recentShare}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-[var(--green-deep)]">
                                        {loading ? "…" : `${recentShare}% da equipe chegou neste mês`}
                                    </p>
                                </div>
                            )}
                        </div>
                    }
                />
            </section>

            <InfoCard
                animationDelayN={4}
                cardTitle="Equipe de campo"
                cardDescription="Busque, veja e gerencie os pesquisadores."
                cardAction={
                    <Button variant="outline" size="sm" onClick={loadResearchers} disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </Button>
                }
                cardContent={
                    <ListaPesquisadores
                        researchers={researchers}
                        companyNames={companyNames}
                        loading={loading}
                        canDelete={canRegister}
                        canEdit={canRegister}
                        canDeactivate={canRegister}
                        showCompany={isSuperAdmin}
                        onDeleted={handleDeleted}
                        onUpdated={handleUpdated}
                        referenceTime={referenceTime}
                        maxHeightClassName="max-h-[34rem]"
                    />
                }
            />
        </section>
    );
}
