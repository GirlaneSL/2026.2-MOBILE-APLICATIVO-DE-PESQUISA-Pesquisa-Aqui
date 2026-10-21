'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { Button } from "@/components/ui/button";
import { Contour } from "@/components/ui/contour";
import DialogLayout from "@/components/ui/dialogLayout";
import { TableSearch, TableViewControls, type TableView } from "@/components/ui/data-table";
import { LoadingState } from "@/components/ui/loadingState";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFieldSnapshot } from "@/hooks/useFieldSnapshot";
import { isSessionExpiredError } from "@/lib/apiFetcher";
import { deleteResearch, getResearches, publishResearch, type Research } from "@/lib/research";
import type { UserItem } from "@/lib/user";
import { ArrowDownAZ, CalendarClock, Plus, SearchX, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import CadastrarPesquisaForm from "./components/CadastrarPesquisaForm";
import CalendarioCampo, { type LegendItem } from "./components/CalendarioCampo";
import PesquisaCard from "./components/PesquisaCard";
import PesquisaLinha, { ListaPesquisas } from "./components/PesquisaLinha";
import type { Filter } from "./components/pesquisaView";
import "./pesquisas.css";

type Sort = "recent" | "name" | "deadline";

const FILTERS: { value: Filter; label: string; kind: LegendItem["kind"] }[] = [
    { value: "ALL", label: "Todas", kind: "all" },
    { value: "IN_FIELD", label: "Em campo", kind: "live" },
    { value: "PUBLISHED", label: "Publicadas", kind: "pub" },
    { value: "DRAFT", label: "Rascunhos", kind: "draft" },
    { value: "CLOSED", label: "Encerradas", kind: "closed" },
];

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Pesquisas() {
    const [researches, setResearches] = useState<Research[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refresh, setRefresh] = useState(0);
    const [filter, setFilter] = useState<Filter>("ALL");
    const [sort, setSort] = useState<Sort>("recent");
    const [query, setQuery] = useState("");
    const [view, setView] = useState<TableView>("cards");
    const [now] = useState(() => Date.now());

    // Equipe e coletas da empresa só estão disponíveis para o administrador.
    const { user } = useCurrentUser();
    const isAdmin = user?.profile === "ADMINISTRATOR";
    const { snapshot } = useFieldSnapshot(isAdmin);
    const teamReady = isAdmin && !!snapshot;
    const teamLoading = !teamReady;

    const forceRefresh = useCallback(() => setRefresh((n) => n + 1), []);

    useEffect(() => {
        let cancelled = false;
        getResearches()
            .then((data) => {
                if (cancelled) return;
                setResearches(data ?? []);
                setError(null);
            })
            .catch((err) => {
                if (cancelled || isSessionExpiredError(err)) return;
                setError(err instanceof Error ? err.message : "Erro ao carregar pesquisas");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [refresh]);

    const counts = useMemo(() => {
        const c = { ALL: researches.length, DRAFT: 0, PUBLISHED: 0, IN_FIELD: 0, CLOSED: 0 } as Record<Filter, number>;
        for (const r of researches) c[r.status] += 1;
        return c;
    }, [researches]);

    const collectionsByResearch = useMemo(() => {
        const map = new Map<number, number>();
        for (const c of snapshot?.collections ?? []) map.set(c.researchId, (map.get(c.researchId) ?? 0) + 1);
        return map;
    }, [snapshot]);

    const researchersById = useMemo(() => new Map((snapshot?.researchers ?? []).map((u) => [u.id, u])), [snapshot]);

    const visible = useMemo(() => {
        const term = normalize(query.trim());
        const list = researches.filter(
            (r) =>
                (filter === "ALL" || r.status === filter) &&
                (!term || normalize(`${r.title} ${r.objective ?? ""} ${r.targetAudience ?? ""}`).includes(term))
        );
        return list.sort((a, b) =>
            sort === "deadline"
                ? new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
                : sort === "name"
                  ? a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base", numeric: true })
                  : new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime() || b.id - a.id
        );
    }, [researches, filter, query, sort]);

    // "Publicadas" só aparece na legenda quando existe alguma (ou quando é o filtro escolhido).
    const legend: LegendItem[] = FILTERS.filter((f) => f.value !== "PUBLISHED" || counts.PUBLISHED > 0 || filter === "PUBLISHED").map((f) => ({
        ...f,
        count: loading ? null : counts[f.value],
    }));

    /* ---------- ações (publicar e excluir pedem confirmação) ---------- */

    const confirmToast = (id: string, message: string, label: string, destructive: boolean, onConfirm: () => void) =>
        toast(
            (t) => (
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{message}</span>
                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => toast.dismiss(t.id)}>Cancelar</Button>
                        <Button
                            variant={destructive ? "destructive" : "default"}
                            size="sm"
                            onClick={() => {
                                toast.dismiss(t.id);
                                onConfirm();
                            }}
                        >
                            {label}
                        </Button>
                    </div>
                </div>
            ),
            { duration: 6000, id }
        );

    const handleDelete = (id: number) => {
        const item = researches.find((r) => r.id === id);
        confirmToast(`delete-${id}`, `Tem certeza que deseja excluir "${item?.title ?? id}"?`, "Excluir", true, async () => {
            try {
                await deleteResearch(id);
                setResearches((prev) => prev.filter((r) => r.id !== id));
                toast.success("Pesquisa excluída com sucesso!");
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erro ao excluir pesquisa");
            }
        });
    };

    const handlePublish = (id: number) => {
        const item = researches.find((r) => r.id === id);
        confirmToast(
            `publish-${id}`,
            `Publicar "${item?.title ?? id}"? Depois de publicada, a pesquisa não pode mais ser excluída.`,
            "Publicar",
            false,
            async () => {
                try {
                    const updated = await publishResearch(id);
                    setResearches((prev) => prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r)));
                    toast.success("Pesquisa publicada com sucesso!");
                } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erro ao publicar pesquisa");
                }
            }
        );
    };

    const handleUpdated = (updated: Research) =>
        setResearches((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));

    const itemProps = (research: Research) => ({
        research,
        team: (snapshot?.links[research.id] ?? []).map((id) => researchersById.get(id)).filter((u): u is UserItem => !!u),
        collections: collectionsByResearch.get(research.id) ?? 0,
        teamLoading,
        now,
        onPublish: handlePublish,
        onDelete: handleDelete,
        onUpdated: handleUpdated,
    });

    const clearFilters = () => {
        setQuery("");
        setFilter("ALL");
    };

    return (
        <section className="pa-pesq flex flex-col gap-6">
            <BannerComponent
                title="Pesquisas"
                description="Monte questionários, publique para o campo e acompanhe cada pesquisa."
                actions={
                    <DialogLayout
                        triggerButtonSize="default"
                        dialogTrigger={<><Plus />Nova pesquisa</>}
                        dialogTitle="Nova pesquisa"
                        dialogDescription="Informe os dados principais. As questões entram na próxima etapa."
                        dialogContent={<CadastrarPesquisaForm onSuccess={forceRefresh} />}
                    />
                }
            />

            {/* Calendário de campo: também é o filtro de situação */}
            <CalendarioCampo
                rows={visible}
                all={researches}
                legend={legend}
                filter={filter}
                onFilter={setFilter}
                now={now}
                loading={loading}
                collectionsByResearch={collectionsByResearch}
                collectionsReady={teamReady}
                totalCollections={snapshot?.collections.length}
            />

            {/* Ferramentas */}
            <div className="pq-tools introduction-card">
                <TableSearch
                    value={query}
                    onChange={setQuery}
                    placeholder="Buscar por título, objetivo ou público..."
                    label="Buscar pesquisas"
                />
                {!loading && <span className="pq-found">{visible.length} {visible.length === 1 ? "pesquisa" : "pesquisas"}</span>}
                <div className="grow">
                    <TableViewControls<Sort>
                        sort={sort}
                        onSortChange={setSort}
                        view={view}
                        onViewChange={setView}
                        sortOptions={[
                            { value: "recent", label: "Recentes", icon: <CalendarClock /> },
                            { value: "name", label: "A-Z", icon: <ArrowDownAZ /> },
                            { value: "deadline", label: "Prazo", icon: <Timer /> },
                        ]}
                    />
                </div>
            </div>

            {error && <p role="alert" className="text-sm text-destructive">Erro: {error}</p>}

            {loading ? (
                <LoadingState label="Carregando pesquisas..." shape={view === "table" ? "table" : "research-cards"} columns={5} />
            ) : visible.length === 0 ? (
                <div className="pq-empty">
                    <Contour seed={1.9} rings={9} cx={0.5} cy={0.5} size={1} width={600} height={260} />
                    <SearchX aria-hidden="true" />
                    {researches.length === 0 ? (
                        <>
                            <b>Nenhuma pesquisa ainda</b>
                            Crie a primeira com &quot;Nova pesquisa&quot; e ela aparece aqui.
                        </>
                    ) : (
                        <>
                            <b>Nada encontrado</b>
                            Nenhuma pesquisa combina com a busca e a situação escolhidas.
                            <div className="pq-empty-act">
                                <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>
                            </div>
                        </>
                    )}
                </div>
            ) : view === "table" ? (
                <ListaPesquisas>
                    {visible.map((research) => (
                        <PesquisaLinha key={research.id} {...itemProps(research)} />
                    ))}
                </ListaPesquisas>
            ) : (
                <div className="pq-grid">
                    {visible.map((research) => (
                        <PesquisaCard key={research.id} {...itemProps(research)} />
                    ))}
                </div>
            )}
        </section>
    );
}
