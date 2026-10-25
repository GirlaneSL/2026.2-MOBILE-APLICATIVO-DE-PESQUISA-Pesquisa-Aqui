"use client"

import { BrandMark, Contour } from "@/components/ui/contour"
import { GlobalSearch } from "@/components/ui/global-search"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useFieldSnapshot } from "@/hooks/useFieldSnapshot"
import { logout } from "@/lib/auth"
import { avatarTone, teamRowsOf } from "@/lib/fieldData"
import { Building2, ChevronLeft, LayoutDashboard, LogIn, LogOut, NotebookPen, UsersRound, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"

type NavItem = {
    href: string
    label: string
    icon: LucideIcon
    profiles: ReadonlyArray<"SUPERADMINISTRATOR" | "ADMINISTRATOR" | "RESEARCHER">
    /** Contador mostrado ao lado do nome (só para o administrador). */
    count?: "researches" | "researchers"
}

const NAV_ITEMS: NavItem[] = [
    { href: "/", label: "Início", icon: LayoutDashboard, profiles: ["SUPERADMINISTRATOR", "ADMINISTRATOR", "RESEARCHER"] },
    { href: "/empresas", label: "Empresas", icon: Building2, profiles: ["SUPERADMINISTRATOR"] },
    { href: "/empresa", label: "Empresa", icon: Building2, profiles: ["ADMINISTRATOR"] },
    { href: "/pesquisadores", label: "Pesquisadores", icon: UsersRound, profiles: ["ADMINISTRATOR"], count: "researchers" },
    { href: "/pesquisas", label: "Pesquisas", icon: NotebookPen, profiles: ["ADMINISTRATOR", "RESEARCHER"], count: "researches" },
]

const PROFILE_LABELS: Record<string, string> = {
    SUPERADMINISTRATOR: "Superadministrador",
    ADMINISTRATOR: "Administrador",
    RESEARCHER: "Pesquisador",
}

const initialsOf = (name?: string) =>
    (name ?? "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "?"

export function AppSidebar() {
    const pathname = usePathname()
    const { user } = useCurrentUser()
    const [collapsed, setCollapsed] = useState(false)

    const items = NAV_ITEMS.filter((item) => user && item.profiles.includes(user.profile))

    // Só o administrador tem a equipe e as coletas da empresa para acompanhar.
    const isAdmin = user?.profile === "ADMINISTRATOR"
    const { snapshot, loading: fieldLoading } = useFieldSnapshot(isAdmin)
    const inField = useMemo(
        () => teamRowsOf(snapshot).filter((row) => row.inField),
        [snapshot]
    )
    const counts = {
        researches: snapshot?.totals.researches,
        researchers: snapshot?.totals.researchers,
    }

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)

    const logoutUser = async () => {
        try {
            await logout()
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <aside className={`pa-side ${collapsed ? "c" : ""}`}>
            <div className="pa-side-in">
                <div className="pa-side-head">
                    <Link href="/" className="pa-brand" aria-label="Pesquisa Aqui, ir para o início">
                        <BrandMark />
                        <span>Pesquisa Aqui</span>
                    </Link>
                    <button
                        type="button"
                        className="pa-collapse"
                        onClick={() => setCollapsed((value) => !value)}
                        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
                        aria-expanded={!collapsed}
                    >
                        <ChevronLeft />
                    </button>
                </div>

                <GlobalSearch
                    profile={user?.profile}
                    pages={items.map(({ href, label, icon }) => ({ href, label, icon }))}
                    collapsed={collapsed}
                />

                <div className="pa-sgroup">
                    <p>Navegação</p>
                    <nav className="pa-snav" aria-label="Principal">
                        {items.map(({ href, label, icon: Icon, count }) => (
                            <Link
                                key={href}
                                href={href}
                                className={isActive(href) ? "on" : undefined}
                                aria-current={isActive(href) ? "page" : undefined}
                                title={collapsed ? label : undefined}
                            >
                                <span className="t"><Icon strokeWidth={1.7} /></span>
                                <span className="l">{label}</span>
                                {count && isAdmin && counts[count] !== undefined && (
                                    <span className="n" aria-label={`${counts[count]} no total`}>{counts[count]}</span>
                                )}
                            </Link>
                        ))}
                    </nav>
                </div>

                {isAdmin && (
                    <div className="pa-live" aria-live="polite">
                        <Contour seed={6.2} rings={8} cx={1.0} cy={0.0} size={1.3} width={240} height={190} />
                        <div className="k"><i />Em campo agora</div>
                        <b>{fieldLoading ? "–" : inField.length}</b>
                        <span className="s">
                            {inField.length === 1 ? "pesquisador coletando" : "pesquisadores coletando"}
                        </span>
                        {inField.length > 0 && (
                            <div className="pa-stack" title={inField.map((row) => row.user.name).join(", ")}>
                                {inField.slice(0, 3).map(({ user: person }) => (
                                    <div key={person.id} className={`avatar-pa ${avatarTone(person.id)}`}>{initialsOf(person.name)}</div>
                                ))}
                                {inField.length > 3 && <div className="avatar-pa more">+{inField.length - 3}</div>}
                            </div>
                        )}
                    </div>
                )}

                {user ? (
                    <div className="pa-suser">
                        <div className="avatar-pa avatar">{initialsOf(user.name)}</div>
                        <div className="who">
                            <b>{user.name}</b>
                            <span>{PROFILE_LABELS[user.profile] ?? user.profile}</span>
                        </div>
                        <button type="button" className="out" onClick={logoutUser} aria-label="Sair da conta">
                            <LogOut strokeWidth={1.7} />
                        </button>
                    </div>
                ) : (
                    <div className="pa-snav" style={{ marginTop: "auto" }}>
                        <Link href="/login">
                            <span className="t"><LogIn strokeWidth={1.7} /></span>
                            <span className="l">Entrar</span>
                        </Link>
                    </div>
                )}
            </div>
        </aside>
    )
}
