import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime, type ActivityItem } from "@/lib/dashboard";
import { useState } from "react";

type UltimasAtualizacoesListProps = {
    items: ActivityItem[];
    loading?: boolean;
};

/** Linha do tempo sobre fundo escuro. Pessoas novas ganham o ponto em argila. */
export default function UltimasAtualizacoesList({ items, loading = false }: UltimasAtualizacoesListProps) {
    const [now] = useState(() => Date.now());

    if (loading) {
        return (
            <div className="mt-5 flex flex-col gap-3" aria-busy="true">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full bg-white/10" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return <div className="pa-empty">Nada mudou por aqui ainda.</div>;
    }

    return (
        <ul className="pa-timeline">
            {items.slice(0, 6).map((item) => (
                <li key={item.id} className={item.kind === "researcher" || item.kind === "admin" ? "clay" : undefined}>
                    <b title={item.message}>{item.message}</b>
                    <span title={item.date.toLocaleString("pt-BR")}>{formatRelativeTime(item.date, now)}</span>
                </li>
            ))}
        </ul>
    );
}
