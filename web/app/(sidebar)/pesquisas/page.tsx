'use client'

import BannerComponent from "@/components/ui/bannerComponent";
import { Button } from "@/components/ui/button";
import { Contour } from "@/components/ui/contour";
import DialogLayout from "@/components/ui/dialogLayout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFieldSnapshot } from "@/hooks/useFieldSnapshot";
import { isSessionExpiredError } from "@/lib/apiFetcher";
import { daysUntilEnd } from "@/lib/fieldData";
import { deleteResearch, getResearches, publishResearch, type Research } from "@/lib/research";
import type { UserItem } from "@/lib/user";
import { LayoutGrid, NotebookPen, Plus, Rows3, Search, SearchX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import InfoCard from "../(home)/components/infoCards";
import CadastrarPesquisaForm from "./components/CadastrarPesquisaForm";
import PesquisaCard from "./components/PesquisaCard";
import TabelaPesquisas from "./components/TabelaPesquisas";

type Filter = "ALL" | Research["status"];
type Sort = "recent" | "deadline";

const FILTERS: { value: Filter; label: string }[] = [
    { value: "ALL", label: "Todas" },
    { value: "IN_FIELD", label: "Em campo" },
    { value: "PUBLISHED", label: "Publicadas" },
    { value: "DRAFT", label: "Rascunhos" },
    { value: "CLOSED", label: "Encerradas" },
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
    const [view, setView] = useState<"cards" | "table">("cards");
    const [now] = useState(() => Date.now());

    // Equipe e coletas da empresa só estão disponíveis para o administrador.
    const { user } = useCurrentUser();
    const isAdmin = user?.profile === "ADMINISTRATOR";
    const { snapshot, loading: snapshotLoading } = useFieldSnapshot(isAdmin);
    const teamLoading = !isAdmin || snapshotLoading;

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

    const endingSoon = useMemo(
        () =>
            researches.filter((r) => {
                if (r.status !== "PUBLISHED" && r.status !== "IN_FIELD") return false;
                const d = daysUntilEnd(r.endDate, now);
                return d !== null && d >= 0 && d <= 7;
            }).length,
        [researches, now]
    );

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
                : new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime() || b.id - a.id
        );
    }, [researches, filter, query, sort]);

    /* ---------- ações (as mesmas da tabela: publicar e excluir pedem confirmação) ---------- */

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

    const active = counts.IN_FIELD + counts.PUBLISHED;
    const totalCollections = snapshot?.collections.length;
    const dash = (value: number | undefined) => (loading || value === undefined ? "–" : value);

    return (
        <section className="flex flex-col gap-5">
            <BannerComponent
                title="Pesquisas"
                description="Monte questionários, publique para o campo e acompanhe cada pesquisa."
                actions={
                    <DialogLayout
                        triggerButtonSize="sm"
                        dialogTrigger={<><Plus />Nova pesquisa</>}
                        dialogTitle="Nova pesquisa"
                        dialogDescription="Informe os dados principais. As questões entram na próxima etapa."
                        dialogContent={<CadastrarPesquisaForm onSuccess={forceRefresh} />}
                    />
                }
            />

            {/* Faixa de resumo */}
            <div className="pa-rs-hero introduction-card">
                <Contour seed={3.3} rings={12} cx={0.92} cy={0.5} size={1} width={900} height={200} />
                <div className="lead">
                    <p>Em andamento</p>
                    <b>{dash(active)}</b>
                    <span>{active === 1 ? "pesquisa ativa" : "pesquisas ativas"}</span>
                    {!loading && endingSoon > 0 && (
                        <span className="pa-chip clay"><i />{endingSoon} {endingSoon === 1 ? "encerra" : "encerram"} em até 7 dias</span>
                    )}
                </div>
                <dl className="tiles">
                    <div><dt>Em campo</dt><dd>{dash(counts.IN_FIELD)}</dd></div>
                    <div><dt>Rascunhos</dt><dd>{dash(counts.DRAFT)}</dd></div>
                    <div><dt>Encerradas</dt><dd>{dash(counts.CLOSED)}</dd></div>
                    <div><dt>Coletas</dt><dd>{teamLoading ? "–" : totalCollections ?? "–"}</dd></div>
                </dl>
            </div>

            {/* Barra de ferramentas */}
            <div className="pa-rs-bar introduction-card">
                <div className="search">
                    <Search aria-hidden="true" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar por título, objetivo ou público..."
                        aria-label="Buscar pesquisas"
                    />
                </div>
                <div className="pa-legend" role="group" aria-label="Filtrar por situação">
                    {FILTERS.map((f) => (
                        <button key={f.value} type="button" className={filter === f.value ? "on" : ""} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
                            {f.label}<em>{counts[f.value]}</em>
                        </button>
                    ))}
                </div>
                <div className="end">
                    {view === "cards" && (
                        <div className="pa-legend" role="group" aria-label="Ordenar">
                            <button type="button" className={sort === "recent" ? "on" : ""} aria-pressed={sort === "recent"} onClick={() => setSort("recent")}>Recentes</button>
                            <button type="button" className={sort === "deadline" ? "on" : ""} aria-pressed={sort === "deadline"} onClick={() => setSort("deadline")}>Prazo</button>
                        </div>
                    )}
                    <div className="pa-legend" role="group" aria-label="Modo de exibição">
                        <button type="button" className={view === "cards" ? "on" : ""} aria-pressed={view === "cards"} onClick={() => setView("cards")} aria-label="Ver em cartões"><LayoutGrid /></button>
                        <button type="button" className={view === "table" ? "on" : ""} aria-pressed={view === "table"} onClick={() => setView("table")} aria-label="Ver em tabela"><Rows3 /></button>
                    </div>
                </div>
            </div>

            {error && <p role="alert" className="text-sm text-destructive">Erro: {error}</p>}

            {view === "table" ? (
                <InfoCard
                    animationDelayN={2}
                    icon={<NotebookPen />}
                    cardTitle="Todas as pesquisas"
                    cardDescription="Abra uma pesquisa para ver as questões, a equipe e as coletas."
                    cardContent={<TabelaPesquisas refreshTrigger={refresh} onChange={forceRefresh} />}
                />
            ) : loading ? (
                <div className="pa-rc-grid" aria-busy="true">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}
                </div>
            ) : visible.length === 0 ? (
                <div className="pa-rs-empty introduction-card">
                    <Contour seed={1.9} rings={9} cx={0.5} cy={0.5} size={1} width={600} height={260} />
                    <SearchX aria-hidden="true" />
                    {researches.length === 0 ? (
                        <>
                            <h3>Nenhuma pesquisa ainda</h3>
                            <p>Crie a primeira com &quot;Nova pesquisa&quot; e ela aparece aqui.</p>
                        </>
                    ) : (
                        <>
                            <h3>Nada encontrado</h3>
                            <p>Nenhuma pesquisa combina com a busca e o filtro escolhidos.</p>
                            <Button variant="outline" size="sm" onClick={() => { setQuery(""); setFilter("ALL"); }}>Limpar filtros</Button>
                        </>
                    )}
                </div>
            ) : (
                <div className="pa-rc-grid">
                    {visible.map((research) => (
                        <PesquisaCard
                            key={research.id}
                            research={research}
                            team={(snapshot?.links[research.id] ?? []).map((id) => researchersById.get(id)).filter((u): u is UserItem => !!u)}
                            collections={collectionsByResearch.get(research.id) ?? 0}
                            teamLoading={teamLoading}
                            now={now}
                            onPublish={handlePublish}
                            onDelete={handleDelete}
                            onUpdated={handleUpdated}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
