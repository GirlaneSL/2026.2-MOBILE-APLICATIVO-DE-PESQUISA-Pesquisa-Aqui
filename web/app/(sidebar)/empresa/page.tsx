'use client';

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import BannerComponent from "@/components/ui/bannerComponent";
import { Contour, Pin } from "@/components/ui/contour";
import { getCompanies } from "@/lib/company";
import { LoadingState } from "@/components/ui/loadingState";
import {
    ArrowUpRight,
    Check,
    ClipboardList,
    Copy,
    Fingerprint,
    Mail,
    MapPinned,
    Phone,
    ShieldCheck,
    ShieldOff,
    Smartphone,
    UsersRound,
    AtSign,
    CalendarDays,
    History,
} from "lucide-react";

export interface Company {
    id?: string;
    legalName: string;
    contactInformation: string;
    situation?: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
    updatedAt?: string;
}

const formatLong = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const initialsOf = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || '?';

type ContactKind = 'email' | 'phone' | 'text';

const classifyContact = (line: string): { kind: ContactKind; href?: string } => {
    const value = line.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { kind: 'email', href: `mailto:${value}` };
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 8 && /^[\d\s()+\-.]+$/.test(value)) return { kind: 'phone', href: `tel:${digits}` };
    return { kind: 'text' };
};

const CONTACT_ICON: Record<ContactKind, ReactNode> = {
    email: <Mail />,
    phone: <Phone />,
    text: <AtSign />,
};

function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <button
            type="button"
            onClick={copy}
            aria-label="Copiar código da empresa"
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-all ${
                copied ? 'bg-[var(--green-deep)] text-white' : 'bg-ink text-white hover:bg-[#26332c]'
            }`}
        >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
        </button>
    );
}

/** Painel branco com cantos amplos, igual aos do dashboard. */
function Panel({
    icon,
    title,
    description,
    children,
    className = '',
    delay = 1,
}: {
    icon: ReactNode;
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
    delay?: number;
}) {
    return (
        <article
            style={{ animationDelay: `${delay * 120}ms` }}
            className={`pa-card introduction-card ${className}`}
        >
            <header className="pa-card-h">
                <div className="pa-ic">{icon}</div>
                <div className="grow">
                    <h3>{title}</h3>
                    {description && <p className="desc">{description}</p>}
                </div>
            </header>
            <div className="mt-5">{children}</div>
        </article>
    );
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
        return <LoadingState label="Abrindo os dados da empresa..." shape="profile" />;
    }

    if (error || !company) {
        return (
            <section className="flex flex-col gap-6">
                <BannerComponent title="Empresa" />
                <div className="rounded-[22px] border border-dashed border-input bg-muted/40 p-8 text-center text-sm text-destructive">
                    {error || 'Nenhuma empresa encontrada para esta conta.'}
                </div>
            </section>
        );
    }

    const isActive = company.situation === 'ACTIVE';
    const contacts = (company.contactInformation || '')
        .split(/\r?\n|;/)
        .map((l) => l.trim())
        .filter(Boolean);

    return (
        <section className="flex flex-col gap-5">
            {/* Credencial da empresa */}
            <article className="pa-card dark introduction-card !p-0">
                <Contour seed={7} rings={14} cx={0.88} cy={0.45} size={1.25} width={900} height={320} />
                <div className="pointer-events-none !absolute inset-0 hidden md:block" aria-hidden="true">
                    <Pin
                        label={isActive ? "Coleta liberada" : "Coleta bloqueada"}
                        tone={isActive ? "mint" : "clay"}
                        left="82%"
                        top="34%"
                    />
                </div>

                <div className="relative flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:p-9">
                    <div className="grid size-24 shrink-0 place-items-center rounded-[28px] bg-[var(--mint)] text-[34px] font-semibold tracking-tight text-[var(--forest)] shadow-[0_18px_40px_-18px_rgba(191,227,208,0.7)] ring-8 ring-[rgba(191,227,208,0.12)]">
                        {initialsOf(company.legalName)}
                    </div>

                    <div className="min-w-0">
                        <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-dark)]">
                            <MapPinned className="size-3.5" /> Empresa
                        </p>
                        <h1 className="truncate text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--fg-dark)] sm:text-[40px]">
                            {company.legalName}
                        </h1>
                        <div className="mt-4 flex flex-wrap items-center gap-2.5">
                            <span
                                className={`inline-flex h-7 items-center gap-2 rounded-full px-3 text-[13px] font-medium ${
                                    isActive
                                        ? 'bg-[rgba(191,227,208,0.16)] text-[var(--mint)]'
                                        : 'bg-[rgba(224,145,122,0.18)] text-[#f0b09c]'
                                }`}
                            >
                                <span className="relative flex size-2">
                                    {isActive && (
                                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--mint)] opacity-60" />
                                    )}
                                    <span
                                        className={`relative inline-flex size-2 rounded-full ${
                                            isActive ? 'bg-[var(--mint)]' : 'bg-[#e0917a]'
                                        }`}
                                    />
                                </span>
                                {isActive ? 'Cadastro ativo' : 'Cadastro inativo'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted-dark)]">
                                <CalendarDays className="size-3.5" />
                                No Pesquisa Aqui desde {formatLong(company.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>
            </article>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                {/* Coleta no aplicativo */}
                <Panel
                    delay={1}
                    className={`lg:col-span-3 ${isActive ? 'mint' : ''}`}
                    icon={isActive ? <ShieldCheck /> : <ShieldOff />}
                    title="Coleta no aplicativo"
                    description="Define se a equipe pode coletar em campo."
                >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        {/* celular ilustrado */}
                        <div className="relative mx-auto h-[132px] w-[78px] shrink-0 rounded-[20px] border-[3px] border-[var(--forest)] bg-white p-1.5 shadow-[0_16px_30px_-18px_rgba(10,20,16,0.6)] sm:mx-0">
                            <div className="mx-auto mb-1.5 h-1 w-6 rounded-full bg-[var(--forest)]/80" />
                            <div
                                className={`grid h-[96px] place-items-center rounded-xl ${
                                    isActive ? 'bg-[var(--mint)]' : 'bg-[#f3e0d9]'
                                }`}
                            >
                                {isActive ? (
                                    <Smartphone className="size-7 text-[var(--green-deep)]" />
                                ) : (
                                    <ShieldOff className="size-7 text-[var(--clay-ink)]" />
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-lg font-semibold tracking-tight">
                                {isActive ? 'Liberada' : 'Bloqueada'}
                            </p>
                            <p className="mt-1 max-w-md text-sm text-[#3c4a42]">
                                {isActive
                                    ? 'Os pesquisadores podem baixar pesquisas e enviar coletas.'
                                    : 'Os pesquisadores não conseguem entrar no aplicativo.'}
                            </p>
                            {!isActive && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Fale com o suporte informando o código da empresa para reativar.
                                </p>
                            )}
                        </div>
                    </div>
                </Panel>

                {/* Código */}
                <Panel
                    delay={2}
                    className="lg:col-span-2"
                    icon={<Fingerprint />}
                    title="Código da empresa"
                    description="Use este código ao falar com o suporte."
                >
                    <div className="flex items-center gap-2 rounded-2xl border border-dashed border-input bg-muted/50 p-2 pl-4">
                        <code className="min-w-0 flex-1 truncate font-mono text-lg font-semibold tracking-wide">
                            {company.id || 'Não informado'}
                        </code>
                        {company.id && <CopyButton value={String(company.id)} />}
                    </div>
                </Panel>
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                {/* Contato */}
                <Panel
                    delay={3}
                    className="lg:col-span-3"
                    icon={<Phone />}
                    title="Contato"
                    description="Como falar com a organização."
                >
                    {contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum contato informado.</p>
                    ) : (
                        <ul className="grid gap-2.5 sm:grid-cols-2">
                            {contacts.map((line, i) => {
                                const { kind, href } = classifyContact(line);
                                const inner = (
                                    <>
                                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e4ece7] text-[var(--green-deep)] transition-colors group-hover:bg-[var(--forest)] group-hover:text-[var(--mint)] [&>svg]:size-[18px]">
                                            {CONTACT_ICON[kind]}
                                        </span>
                                        <span className="min-w-0 flex-1 break-words text-sm font-medium">{line}</span>
                                        {href && (
                                            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                        )}
                                    </>
                                );
                                const cls =
                                    'group flex items-center gap-3 rounded-2xl border border-border bg-white p-2.5 pr-3.5 transition-all hover:border-[#c6d0c9] hover:shadow-[0_14px_26px_-22px_rgba(10,20,16,0.5)]';

                                return (
                                    <li key={i}>
                                        {href ? (
                                            <a href={href} className={cls}>{inner}</a>
                                        ) : (
                                            <div className={cls}>{inner}</div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Panel>

                {/* Linha do tempo */}
                <Panel
                    delay={4}
                    className="lg:col-span-2"
                    icon={<History />}
                    title="Histórico do cadastro"
                    description="Datas importantes da conta."
                >
                    <ol className="relative flex flex-col gap-5 pl-6 before:absolute before:bottom-1 before:left-[7px] before:top-1 before:w-px before:bg-border">
                        <li className="relative">
                            <span className="absolute -left-6 top-1 size-[15px] rounded-full border-[3px] border-white bg-[var(--green)] ring-1 ring-[var(--green)]" />
                            <p className="text-[13px] text-muted-foreground">Empresa cadastrada</p>
                            <p className="text-sm font-medium">{formatLong(company.createdAt)}</p>
                        </li>
                        <li className="relative">
                            <span className="absolute -left-6 top-1 size-[15px] rounded-full border-[3px] border-white bg-[var(--mint)] ring-1 ring-[var(--green)]" />
                            <p className="text-[13px] text-muted-foreground">Última atualização</p>
                            <p className="text-sm font-medium">{formatLong(company.updatedAt ?? company.createdAt)}</p>
                        </li>
                    </ol>
                </Panel>
            </section>

            {/* Atalhos */}
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {[
                    { href: '/pesquisadores', icon: <UsersRound />, title: 'Equipe de campo', text: 'Veja e cadastre os pesquisadores da empresa.' },
                    { href: '/pesquisas', icon: <ClipboardList />, title: 'Pesquisas', text: 'Acompanhe as pesquisas e as coletas em andamento.' },
                ].map((s, i) => (
                    <Link
                        key={s.href}
                        href={s.href}
                        style={{ animationDelay: `${(5 + i) * 120}ms` }}
                        className="pa-card introduction-card group flex items-center gap-4 !p-5"
                    >
                        <div className="pa-ic">{s.icon}</div>
                        <div className="grow">
                            <h3>{s.title}</h3>
                            <p className="desc">{s.text}</p>
                        </div>
                        <span className="grid size-10 place-items-center rounded-full bg-muted text-ink transition-all group-hover:bg-[var(--forest)] group-hover:text-[var(--mint)]">
                            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                    </Link>
                ))}
            </section>
        </section>
    );
}
