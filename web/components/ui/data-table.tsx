"use client"

import { buttonVariants } from "@/components/ui/button"
import { Contour } from "@/components/ui/contour"
import { LoadingState } from "@/components/ui/loadingState"
import { avatarTone, initialsOf } from "@/lib/fieldData"
import { cn } from "@/lib/utils"
import { Search, SearchX, X } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import "./data-table.css"

// Padrão ÚNICO de tabela do painel. Toda listagem em linhas e colunas (pesquisas, pesquisadores,
// empresas, administradores, coletas, equipe da pesquisa) usa estes componentes, para que
// cabeçalho, busca, filtros, linhas, selos, ações e estados vazios sejam sempre iguais:
//
//   <DataTableHeader>   título da tabela + contador
//   <TableTabs>         abas que trocam a tabela (sempre no topo, à esquerda)
//   <DataTableToolbar>  busca (<TableSearch>), filtros (<TableFilters>) e controles extras
//   <DataTable>         a tabela (cabeçalho fixo, rolagem, carregando e vazio já resolvidos)
//   <PersonCell>        avatar + nome + @usuário (primeira coluna de qualquer pessoa)
//   <CellTitle>         título + linha menor (primeira coluna dos demais registros)
//   <RowActions>        coluna de ações, sempre alinhada à direita (botões <Button size="sm"> ou <RowLink>)
//   <TableChip>         selo de situação (mesmas cores em todas as telas)
//
// Não monte <table> na mão nem use o componente "Tabela" antigo: use <DataTable>.
// Se uma tela precisar de algo novo, acrescente aqui em vez de criar outro estilo.

export type DataColumn<T> = {
    id: string
    /** Texto do cabeçalho. */
    header: string
    cell: (row: T) => ReactNode
    /** Coluna de ações / números: alinhada à direita. */
    align?: "right"
    /** Largura mínima da coluna, em CSS (ex.: "12rem"). */
    minWidth?: string
    /** Esconde o texto do cabeçalho (ele continua para leitores de tela). */
    hideHeader?: boolean
}

type DataTableProps<T> = {
    columns: readonly DataColumn<T>[]
    rows: readonly T[]
    getRowKey: (row: T) => string | number
    /** Nome da tabela para leitores de tela. */
    label: string
    loading?: boolean
    loadingLabel?: string
    /** Mostrado quando não há linhas. Use <TableEmpty>. */
    empty?: ReactNode
    /** Altura máxima da área da tabela (ex.: "26rem"); passando disso, rola com o cabeçalho fixo. */
    maxHeight?: string
    /** Classe extra da área da tabela (ex.: uma classe "max-h-96" do Tailwind). */
    className?: string
    /** Largura mínima antes de aparecer a rolagem horizontal. */
    minWidth?: string
    /** Realça a linha (ex.: pesquisador já vinculado). */
    rowTone?: (row: T) => "on" | "off" | undefined
}

export function DataTable<T>({
    columns,
    rows,
    getRowKey,
    label,
    loading = false,
    loadingLabel = "Carregando...",
    empty,
    maxHeight,
    className,
    minWidth = "640px",
    rowTone,
}: DataTableProps<T>) {
    if (loading) {
        return <LoadingState label={loadingLabel} shape="table" columns={Math.min(columns.length, 6)} count={4} />
    }

    if (rows.length === 0) return <>{empty ?? <TableEmpty title="Nada por aqui ainda." />}</>

    return (
        <div className={`pa-dt-wrap ${className ?? ""}`} style={maxHeight ? { maxHeight } : undefined}>
            <table className="pa-dt" style={{ minWidth }} aria-label={label}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.id}
                                scope="col"
                                className={column.align === "right" ? "r" : undefined}
                                style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                            >
                                {column.hideHeader ? <span className="sr-only">{column.header}</span> : column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={getRowKey(row)} className={rowTone?.(row)}>
                            {columns.map((column) => (
                                <td key={column.id} className={column.align === "right" ? "r" : undefined}>
                                    {column.cell(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/* ------------------------------------------------------------------
   Cabeçalho e barra de ferramentas
   ------------------------------------------------------------------ */

export function DataTableHeader({ title, count, children }: { title: string; count?: number | string; children?: ReactNode }) {
    return (
        <div className="pa-dt-head">
            <h4>{title}</h4>
            {count !== undefined && <span className="pa-chip gray">{count}</span>}
            {children && <div className="end">{children}</div>}
        </div>
    )
}

export function DataTableToolbar({ children }: { children: ReactNode }) {
    return <div className="pa-dt-bar">{children}</div>
}

export function TableSearch({
    value,
    onChange,
    placeholder,
    label,
}: {
    value: string
    onChange: (value: string) => void
    placeholder: string
    label: string
}) {
    return (
        <div className="pa-dt-search">
            <Search aria-hidden="true" />
            <input
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={label}
                autoComplete="off"
            />
            {value && (
                <button type="button" onClick={() => onChange("")} aria-label="Limpar busca">
                    <X />
                </button>
            )}
        </div>
    )
}

/** Filtros em selos com contador (Todos / Ativos / …). */
export function TableFilters<V extends string>({
    value,
    onChange,
    options,
    label,
}: {
    value: V
    onChange: (value: V) => void
    options: { value: V; label: string; count?: number; icon?: ReactNode }[]
    label: string
}) {
    return (
        <div className="pa-dt-seg" role="group" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={option.value === value ? "on" : undefined}
                    aria-pressed={option.value === value}
                    onClick={() => onChange(option.value)}
                >
                    {option.icon}
                    {option.label}
                    {option.count !== undefined && <em>{option.count}</em>}
                </button>
            ))}
        </div>
    )
}

/**
 * Abas que trocam o conteúdo da tabela (Pesquisas | Pesquisadores, Empresas | Administradores).
 * Ficam sempre no topo, à esquerda, acima do título da tabela, com ícone e contador.
 */
export function TableTabs<V extends string>(props: {
    value: V
    onChange: (value: V) => void
    options: { value: V; label: string; count?: number; icon?: ReactNode }[]
    label: string
}) {
    return (
        <div className="pa-dt-tabs">
            <TableFilters<V> {...props} />
        </div>
    )
}

/* ------------------------------------------------------------------
   Células
   ------------------------------------------------------------------ */

/** Avatar com as iniciais; a cor é fixa por id. */
export function TableAvatar({ id, name, square = false }: { id: number; name?: string | null; square?: boolean }) {
    return (
        <span className={`avatar-pa pa-dt-av ${avatarTone(id)} ${square ? "sq" : ""}`} aria-hidden="true">
            {initialsOf(name ?? "")}
        </span>
    )
}

/** Primeira coluna de qualquer pessoa: avatar, nome e @usuário. */
export function PersonCell({
    id,
    name,
    username,
    sub,
    badge,
    square = false,
}: {
    id: number
    name: string
    username?: string
    /** Linha menor no lugar do @usuário (ex.: contato da empresa). */
    sub?: ReactNode
    badge?: ReactNode
    square?: boolean
}) {
    return (
        <div className="pa-dt-person">
            <TableAvatar id={id} name={name} square={square} />
            <div className="tx">
                <b title={name}>{name}</b>
                {(sub ?? username) && <small>{sub ?? `@${username}`}</small>}
            </div>
            {badge}
        </div>
    )
}

/** Primeira coluna dos demais registros: título e uma linha menor abaixo. */
export function CellTitle({ title, sub, href }: { title: ReactNode; sub?: ReactNode; href?: string }) {
    return (
        <div className="pa-dt-title">
            {href ? (
                <Link href={href} className="t link">{title}</Link>
            ) : (
                <span className="t">{title}</span>
            )}
            {sub && <small>{sub}</small>}
        </div>
    )
}

export function RowActions({ children }: { children: ReactNode }) {
    return <div className="pa-dt-actions">{children}</div>
}

/** Link de ação da linha (ex.: "Abrir"), com o mesmo visual dos botões de ação. */
export function RowLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            {children}
        </Link>
    )
}

/** Valor secundário (datas, "Sem equipe", "—"). */
export function Muted({ children }: { children: ReactNode }) {
    return <span className="pa-dt-muted">{children}</span>
}

type ChipTone = "live" | "soon" | "off" | "done"

const CHIP_CLASS: Record<ChipTone, string> = {
    live: "light", // verde: ativo, em campo, na equipe
    soon: "clay", // argila: atenção, prazo perto, gravada
    off: "clay", // argila: inativo, rascunho
    done: "gray", // cinza: encerrado, disponível, neutro
}

export function TableChip({ tone, children, title }: { tone: ChipTone; children: ReactNode; title?: string }) {
    return (
        <span className={`pa-chip ${CHIP_CLASS[tone]}`} title={title}>
            <i />
            {children}
        </span>
    )
}

/* ------------------------------------------------------------------
   Estado vazio
   ------------------------------------------------------------------ */

export function TableEmpty({
    title,
    text,
    icon,
    onClear,
}: {
    title: string
    text?: string
    icon?: ReactNode
    /** Quando passado, mostra "Limpar filtros". */
    onClear?: () => void
}) {
    return (
        <div className="pa-dt-empty">
            <Contour seed={4} rings={9} cx={0.5} cy={0.5} size={1.1} style={{ opacity: 0.3 }} />
            <div className="in">
                <span className="ic">{icon ?? <SearchX />}</span>
                <p className="t">{title}</p>
                {text && <p className="s">{text}</p>}
                {onClear && (
                    <button type="button" className="pa-dt-clear" onClick={onClear}>
                        <X /> Limpar filtros
                    </button>
                )}
            </div>
        </div>
    )
}
