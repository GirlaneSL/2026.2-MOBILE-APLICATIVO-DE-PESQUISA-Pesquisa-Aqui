'use client';

import { useEffect, useState } from "react";
import BannerComponent from "@/components/ui/bannerComponent";
import InfoCard from "../(home)/components/infoCards";
import { getCompanies } from "@/lib/company";
import { Spinner } from "@/components/ui/spinner";
import { Building2, Fingerprint, ShieldCheck, Smartphone } from "lucide-react";

export interface Company {
    id?: string;
    legalName: string;
    contactInformation: string;
    situation?: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
}

export default function EmpresaPage() {
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const data = await getCompanies();

                const currentCompany = Array.isArray(data) ? data[0] : data;
                setCompany(currentCompany);
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar dados da empresa');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return (
            <section className="flex flex-col gap-6">
                <BannerComponent title="Empresa" />
                <div className="flex justify-center items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                    <Spinner></Spinner>
                    Abrindo os dados da empresa...
                </div>
            </section>
        );
    }

    if (error || !company) {
        return (
            <section className="flex flex-col gap-6">
                <BannerComponent title="Empresa" />
                <div className="p-8 text-center text-sm text-destructive">
                    {error || 'Nenhuma empresa encontrada para esta conta.'}
                </div>
            </section>
        );
    }

    const isActive = company.situation === 'ACTIVE';

    return (
        <section className="flex flex-col gap-5">
            <BannerComponent title={company.legalName} description="Dados da sua empresa no Pesquisa Aqui." />

            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <InfoCard
                    animationDelayN={1}
                    tone={isActive ? "mint" : "light"}
                    icon={<ShieldCheck />}
                    cardTitle="Situação do cadastro"
                    cardDescription="Define se a equipe pode coletar em campo."
                    cardContent={
                        <span className={`pa-chip ${isActive ? "light" : "clay"}`}>
                            <i />
                            {isActive ? "Ativa" : "Inativa"}
                        </span>
                    }
                />

                <InfoCard
                    animationDelayN={2}
                    icon={<Fingerprint />}
                    cardTitle="Código da empresa"
                    cardDescription="Use este código ao falar com o suporte."
                    cardContent={
                        <code className="block truncate rounded-xl bg-muted px-3 py-2 text-xs">
                            {company.id || "Não informado"}
                        </code>
                    }
                />

                <InfoCard
                    animationDelayN={3}
                    icon={<Smartphone />}
                    cardTitle="Coleta no aplicativo"
                    cardDescription="Disponibilidade para os pesquisadores."
                    cardContent={
                        <p className="text-sm">
                            {isActive
                                ? "Liberada. Os pesquisadores podem baixar pesquisas e enviar coletas."
                                : "Bloqueada. Os pesquisadores não conseguem entrar no aplicativo."}
                        </p>
                    }
                />
            </section>

            <InfoCard
                animationDelayN={4}
                icon={<Building2 />}
                cardTitle="Dados da empresa"
                cardDescription="Informações do cadastro da organização."
                cardContent={
                    <dl className="grid gap-5 text-sm md:grid-cols-2">
                        <div>
                            <dt className="text-muted-foreground">Razão social</dt>
                            <dd className="mt-1 text-base font-medium">{company.legalName}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Contato</dt>
                            <dd className="mt-1 whitespace-pre-line font-medium">{company.contactInformation}</dd>
                        </div>
                    </dl>
                }
            />
        </section>
    );
}
