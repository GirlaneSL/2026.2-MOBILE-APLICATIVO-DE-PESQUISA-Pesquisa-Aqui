'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import DialogLayout from "@/components/ui/dialogLayout";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getCompanies } from "@/lib/company";
import { getResearchers, UserItem } from "@/lib/user";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import InfoCard from "../(home)/components/infoCards";
import CadastrarPesquisadorForm from "./components/CadastrarPesquisadorForm";
import ListaPesquisadores from "./components/ListaPesquisadores";
import { Spinner } from "@/components/ui/spinner";

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

    const stats = useMemo(() => {
        const last30 = referenceTime - 30 * 24 * 60 * 60 * 1000;
        return {
            total: researchers.length,
            companies: new Set(researchers.map((r) => r.companyId)).size,
            recent: researchers.filter((r) => r.createdAt && new Date(r.createdAt).getTime() >= last30).length,
        };
    }, [researchers, referenceTime]);

    const statValue = (n: number) => (loading ? <Spinner className="size-6" /> : n);

    return (
        <section className="flex flex-col gap-5">
            <BannerComponent title="Dados dos Pesquisadores" />

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <InfoCard
                    animationDelayN={2}
                    cardTitle="Total de Pesquisadores"
                    cardDescription={isSuperAdmin ? "Em todas as empresas" : "Na sua empresa"}
                    isCardFooter={false}
                    cardContent={<p className="text-4xl font-bold">{statValue(stats.total)}</p>}
                />

                <InfoCard
                    animationDelayN={3}
                    cardTitle={isSuperAdmin ? "Empresas com Pesquisadores" : "Novos nos Últimos 30 Dias"}
                    cardDescription={isSuperAdmin ? "Empresas que possuem ao menos um pesquisador" : "Pesquisadores cadastrados recentemente"}
                    isCardFooter={false}
                    cardContent={
                        <p className="text-4xl font-bold">
                            {statValue(isSuperAdmin ? stats.companies : stats.recent)}
                        </p>
                    }
                />


                <InfoCard
                    isCardFooter={false}
                    animationDelayN={4}
                    cardTitle="Cadastrar Pesquisador"
                    cardDescription="Cadastre um novo pesquisador"
                    cardClassName="relative col-span-1 md:col-span-2 lg:col-span-1"
                    cardContent={
                        <>
                            <br />
                            <br />
                            <div className="absolute bottom-5 right-5 flex justify-end">
                                
                                {canRegister ? (
                                    <DialogLayout
                                        triggerButtonVariant="outline"
                                        dialogTrigger="Cadastrar"
                                        dialogTitle="Cadastramento do Pesquisador"
                                        dialogDescription="Informe os dados do pesquisador"
                                        dialogContent={
                                            <CadastrarPesquisadorForm
                                                isSuperAdmin={isSuperAdmin}
                                                onSuccess={loadResearchers}
                                            />
                                        }
                                    />
                                ): (
                                    <Spinner className="size-6"/>
                                )}
                            </div>
                        </>
                    }
                />

            </section>

            <InfoCard
                animationDelayN={5}
                cardTitle="Pesquisadores"
                cardDescription="Busque, visualize e gerencie os pesquisadores"
                isCardFooter={false}
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
                        canDelete={isSuperAdmin}
                        showCompany={isSuperAdmin}
                        onDeleted={handleDeleted}
                        maxHeightClassName="max-h-[28rem]"
                    />
                }
            />
        </section>
    );
}
