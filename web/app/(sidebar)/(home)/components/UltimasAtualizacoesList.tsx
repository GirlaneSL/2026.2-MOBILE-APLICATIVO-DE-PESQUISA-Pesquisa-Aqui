import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime, type ActivityItem, type ActivityKind } from "@/lib/dashboard";
import { useState } from "react";
import { Building2, ClipboardList, UserCog, UserPlus, type LucideIcon } from "lucide-react";

const ICONS: Record<ActivityKind, LucideIcon> = {
    company: Building2,
    admin: UserCog,
    research: ClipboardList,
    researcher: UserPlus,
};

type UltimasAtualizacoesListProps = {
    items: ActivityItem[];
    loading?: boolean;
};

export default function UltimasAtualizacoesList({ items, loading = false }: UltimasAtualizacoesListProps) {
    const [now] = useState(() => Date.now());

    if (loading) {
        return (
            <div className="flex flex-col gap-2 overflow-y-auto h-55" aria-busy="true">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-10 min-h-10" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-55 text-sm text-muted-foreground">
                Nenhuma atualização recente.
            </div>
        );
    }

    return (
        <ul className="flex flex-col gap-2 overflow-y-auto h-55">
            {items.map((item) => {
                const Icon = ICONS[item.kind];

                return (
                    <li
                        key={item.id}
                        className="flex items-center gap-2 px-3 min-h-10 rounded-md border bg-background/60"
                    >
                        <Icon className="shrink-0 size-4" />
                        <span className="truncate flex-1 text-sm" title={item.message}>
                            {item.message}
                        </span>
                        <span
                            className="shrink-0 text-xs text-muted-foreground"
                            title={item.date.toLocaleString("pt-BR")}
                        >
                            {formatRelativeTime(item.date, now)}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
