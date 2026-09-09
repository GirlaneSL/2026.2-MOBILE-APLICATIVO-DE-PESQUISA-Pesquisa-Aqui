'use client';

import { useEffect, useState } from "react";
import BannerComponent from "@/components/ui/bannerComponent";
import DialogLayout from "@/components/ui/dialogLayout";
import InfoCard from "../(home)/components/infoCards";
import { getCompanies } from "@/lib/company";
import { Spinner } from "@/components/ui/spinner";

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
                <BannerComponent title="Dados da Empresa" />
                <div className="flex justify-center items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                    <Spinner></Spinner>
                    Carregando informações da empresa...
                </div>
            </section>
        );
    }

    if (error || !company) {
        return (
            <section className="flex flex-col gap-6">
                <BannerComponent title="Dados da Empresa" />
                <div className="p-8 text-center text-sm text-red-500">
                    {error || 'Nenhuma empresa encontrada para esta conta.'}
                </div>
            </section>
        );
    }

    const isActive = company.situation === 'ACTIVE';

    return (
        <section className="flex flex-col gap-6">
            <BannerComponent title="Dados da Empresa" />

            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <InfoCard
                    isCardFooter={false}
                    animationDelayN={1}
                    cardTitle="Situação Cadastral"
                    cardDescription="Status de autorização no sistema"
                    cardContent={
                        <div className="mt-3 flex items-center gap-2">
                            <span
                                className={`inline-block w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'
                                    }`}
                            />
                            <span className="font-semibold text-sm">
                                {company.situation === 'ACTIVE' ?
                                    'ATIVA' : 'INATIVA'
                                }
                            </span>
                        </div>
                    }
                />

                <InfoCard
                    isCardFooter={false}
                    animationDelayN={2}
                    cardTitle="Identificador (ID)"
                    cardDescription="Chave única usada nas requisições da API"
                    cardContent={
                        <div className="mt-2">
                            <code className="bg-muted px-2 py-1.5 rounded block truncate text-xs">
                                {company.id || 'Não informado'}
                            </code>
                        </div>
                    }
                />

                <InfoCard
                    isCardFooter={false}
                    animationDelayN={3}
                    cardTitle="Comunicação com App"
                    cardDescription="Disponibilidade para coleta em campo"
                    cardContent={
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                            <p>
                                Sincronização offline:{" "}
                                <strong className={isActive ? "text-emerald-600" : "text-red-500"}>
                                    {isActive ? "Liberada" : "Bloqueada"}
                                </strong>
                            </p>
                            <p>Pacotes de questionário: <strong>Atualizados</strong></p>
                        </div>
                    }
                />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <InfoCard
                    isCardFooter={true}
                    cardClassName="lg:col-span-3"
                    animationDelayN={4}
                    cardTitle="Dados Institucionais"
                    cardDescription="Informações registradas no cadastro da organização"
                    cardContent={
                        <div className="space-y-4 text-sm mt-4">
                            <div>
                                <span className="text-muted-foreground block text-xs">Razão Social (legalName)</span>
                                <strong className="text-base font-medium">{company.legalName}</strong>
                            </div>

                            <div>
                                <span className="text-muted-foreground block text-xs">Contato (contactInformation)</span>
                                <p className="font-medium whitespace-pre-line text-sm mt-1">
                                    {company.contactInformation}
                                </p>
                            </div>
                        </div>
                    }
                    cardFooterClassName={"w-full flex justify-end"}
                    cardFooter={
                        <div>
                            <DialogLayout
                                triggerButtonVariant="outline"
                                dialogTrigger="Editar Dados"
                                dialogTitle="Editar Informações da Empresa"
                                dialogDescription="Atualize os dados institucionais ou a situação da conta."
                                dialogContent={
                                    <div className="text-sm text-muted-foreground py-4">
                                        Formulário de edição com os campos `legalName` e `contactInformation`.
                                    </div>
                                }
                            />
                        </div>
                    }
                />

                <InfoCard
                    isCardFooter={false}
                    cardClassName="lg:col-span-2"
                    animationDelayN={5}
                    cardTitle="Permissões & Coleta"
                    cardDescription="Regras de segurança no app móvel"
                    cardContent={
                        <div className="space-y-3 mt-3 text-xs">
                            <div className="p-3 border rounded bg-muted/40 space-y-1">
                                <span className="font-semibold block text-foreground">Multi-tenant Enforcement</span>
                                <p className="text-muted-foreground">
                                    O identificador da empresa é validado pelo servidor em todas as rotas. Pesquisadores só baixam dados associados a este cadastro.
                                </p>
                            </div>
                        </div>
                    }
                />
            </section>
        </section>
    );
}