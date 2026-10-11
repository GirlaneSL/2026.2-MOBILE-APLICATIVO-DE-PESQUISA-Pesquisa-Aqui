'use client'

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getResearchLinkedResearchers, linkResearcher, unlinkResearcher } from "@/lib/research";
import { getResearchers, type UserItem } from "@/lib/user";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function PesquisadoresVinculados({ researchId, companyId }: { researchId: number; companyId: number }) {
    const [researchers, setResearchers] = useState<UserItem[]>([]);
    const [linked, setLinked] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const [users, links] = await Promise.all([getResearchers(), getResearchLinkedResearchers(researchId)]);
            setResearchers(users.filter((u) => u.companyId === companyId));
            setLinked(new Set(links.map((l) => l.userId)));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao carregar pesquisadores');
        } finally {
            setLoading(false);
        }
    }, [researchId, companyId]);

    useEffect(() => { load(); }, [load]);

    const toggle = async (user: UserItem) => {
        setBusyId(user.id);
        try {
            if (linked.has(user.id)) {
                await unlinkResearcher(researchId, user.id);
                toast.success('Pesquisador desvinculado');
            } else {
                await linkResearcher(researchId, user.id);
                toast.success('Pesquisador vinculado');
            }
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao atualizar vínculo');
        } finally {
            setBusyId(null);
        }
    };

    if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Spinner />Carregando pesquisadores...</div>;

    if (researchers.length === 0) return <p className="p-4 text-sm text-muted-foreground">Nenhum pesquisador cadastrado nesta empresa.</p>;

    return (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {researchers.map((user) => {
                const isLinked = linked.has(user.id);
                return (
                    <li key={user.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.username}</span>
                        </div>
                        <Button size="sm" variant={isLinked ? "outline" : "default"} disabled={busyId === user.id} onClick={() => toggle(user)}>
                            {isLinked ? 'Desvincular' : 'Vincular'}
                        </Button>
                    </li>
                );
            })}
        </ul>
    );
}
