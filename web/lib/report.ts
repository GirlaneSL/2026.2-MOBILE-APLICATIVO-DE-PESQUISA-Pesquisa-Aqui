import { apiFetch } from "./apiFetcher";

// W12 — painel, relatório, exportação e encerramento.

export interface ReportFilters {
    /** Dia inicial (AAAA-MM-DD, no fuso do navegador). */
    from?: string;
    /** Dia final (AAAA-MM-DD, no fuso do navegador). */
    to?: string;
    researcherId?: number;
}

export interface PanelResearcher {
    userId: number;
    name: string;
    username: string | null;
    avatarUrl?: string | null;
    /** false = foi desvinculado depois de entregar coletas. */
    linked: boolean;
    targetCount: number | null;
    collected: number;
    /** 0 a 100; null quando não há meta. */
    progress: number | null;
    lastSyncAt: string | null;
    lastCollectionAt: string | null;
    averageSeconds: number | null;
    /** Média bem abaixo da dos colegas. */
    suspiciouslyFast: boolean;
}

export interface ResearchPanel {
    researchId: number;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "IN_FIELD" | "CLOSED";
    closedAt: string | null;
    generatedAt: string;
    totalCollections: number;
    targetTotal: number | null;
    goalPercent: number | null;
    averageSeconds: number | null;
    lastSyncAt: string | null;
    researchers: PanelResearcher[];
}

export interface ChartDatum {
    key: string;
    label: string;
    count: number;
    percent: number;
}

export interface QuestionChart {
    questionId: number;
    statement: string;
    type: "YES_NO" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
    answered: number;
    totalCollections: number;
    data: ChartDatum[];
}

export interface ResearchReport {
    researchId: number;
    status: ResearchPanel["status"];
    totalCollections: number;
    questions: QuestionChart[];
}

// O dia escolhido vale no fuso de quem está olhando: 00:00 do primeiro dia até 23:59:59 do último.
const startOfDay = (day: string) => new Date(`${day}T00:00:00`).toISOString();
const endOfDay = (day: string) => new Date(`${day}T23:59:59.999`).toISOString();

export const reportQueryString = (filters: ReportFilters): string => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", startOfDay(filters.from));
    if (filters.to) params.set("to", endOfDay(filters.to));
    if (filters.researcherId !== undefined) params.set("researcherId", String(filters.researcherId));
    const text = params.toString();
    return text ? `?${text}` : "";
};

const readError = async (response: Response, fallback: string) => {
    const errorBody = await response.json().catch(() => null);
    const message = Array.isArray(errorBody?.message) ? errorBody.message.join(", ") : errorBody?.message;
    const error = new Error(message || fallback) as Error & { status?: number };
    error.status = response.status;
    return error;
};

export const getResearchPanel = async (researchId: number, filters: ReportFilters = {}): Promise<ResearchPanel> => {
    const response = await apiFetch(`/research/${researchId}/panel${reportQueryString(filters)}`, { method: "GET", credentials: "include" });
    if (!response.ok) throw await readError(response, "Falha ao carregar o painel");
    return response.json();
};

export const getResearchReport = async (researchId: number, filters: ReportFilters = {}): Promise<ResearchReport> => {
    const response = await apiFetch(`/research/${researchId}/report${reportQueryString(filters)}`, { method: "GET", credentials: "include" });
    if (!response.ok) throw await readError(response, "Falha ao carregar o relatório");
    return response.json();
};

/** Baixa o CSV (uma linha por coleta, uma coluna por questão) com os mesmos filtros da tela. */
export const downloadResearchCsv = async (researchId: number, filters: ReportFilters = {}): Promise<void> => {
    const response = await apiFetch(`/research/${researchId}/export.csv${reportQueryString(filters)}`, { method: "GET", credentials: "include" });
    if (!response.ok) throw await readError(response, "Falha ao exportar as coletas");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pesquisa-${researchId}-coletas.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Encerra a pesquisa: bloqueia coleta nova e congela o resultado. Não tem volta. */
export const closeResearch = async (researchId: number): Promise<void> => {
    const response = await apiFetch(`/research/${researchId}/close`, { method: "POST", credentials: "include", body: JSON.stringify({}) });
    if (!response.ok) throw await readError(response, "Falha ao encerrar a pesquisa");
};

export const formatSeconds = (seconds: number | null): string => {
    if (seconds === null) return "-";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
    return m > 0 ? `${m}min ${String(s).padStart(2, "0")}s` : `${s}s`;
};
