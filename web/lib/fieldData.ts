import { getCollections } from "./collection";
import { getResearches, getResearchLinkedResearchers, type Research } from "./research";
import { getResearchers, type UserItem } from "./user";

/**
 * Dados de campo do painel do administrador: coletas, equipe de cada pesquisa e
 * quem está coletando agora. A API não tem um endpoint de coletas por empresa,
 * então tudo é montado a partir de `/collection?researchId=` e dos vínculos.
 */

export interface FieldCollection {
    id: number;
    researchId: number;
    researcherId: number;
    /** Quando a entrevista terminou no aparelho (é o que conta como atividade em campo). */
    at: Date;
}

export interface FieldSnapshot {
    researches: Research[];
    researchers: UserItem[];
    collections: FieldCollection[];
    /** researchId -> ids dos pesquisadores vinculados. */
    links: Record<number, number[]>;
    loadedAt: number;
    /** true quando alguma consulta falhou e os números podem estar incompletos. */
    partial: boolean;
}

const CACHE_TTL_MS = 30_000;

let cached: FieldSnapshot | null = null;
let inFlight: Promise<FieldSnapshot> | null = null;

async function fetchSnapshot(): Promise<FieldSnapshot> {
    const [researches, researchers] = await Promise.all([getResearches(), getResearchers()]);
    let partial = false;

    // Rascunho não recebe coletas; as outras situações podem ter recebido.
    const withCollections = researches.filter((r) => r.status !== "DRAFT");

    const [collectionResults, linkResults] = await Promise.all([
        Promise.allSettled(withCollections.map((r) => getCollections(r.id))),
        Promise.allSettled(researches.map((r) => getResearchLinkedResearchers(r.id))),
    ]);

    const collections: FieldCollection[] = [];
    collectionResults.forEach((result, i) => {
        if (result.status === "rejected") {
            partial = true;
            return;
        }
        for (const c of result.value) {
            const at = new Date(c.finishedAt ?? c.startedAt);
            if (Number.isNaN(at.getTime())) continue;
            collections.push({ id: c.id, researchId: withCollections[i].id, researcherId: c.researcherId, at });
        }
    });

    const links: Record<number, number[]> = {};
    linkResults.forEach((result, i) => {
        if (result.status === "rejected") {
            partial = true;
            return;
        }
        links[researches[i].id] = result.value.map((l) => l.userId);
    });

    return { researches, researchers, collections, links, loadedAt: Date.now(), partial };
}

/** Carrega (ou reaproveita por 30 s) os dados de campo. Várias telas pedem juntas e só uma consulta sai. */
export function loadFieldSnapshot(force = false): Promise<FieldSnapshot> {
    if (!force && cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return Promise.resolve(cached);
    if (inFlight) return inFlight;

    inFlight = fetchSnapshot()
        .then((snapshot) => {
            cached = snapshot;
            return snapshot;
        })
        .finally(() => {
            inFlight = null;
        });

    return inFlight;
}

/* ------------------------------------------------------------------
   Quem está em campo
   ------------------------------------------------------------------ */

/** Um pesquisador conta como "em campo" se terminou uma coleta nesta janela. */
export const IN_FIELD_WINDOW_MS = 2 * 60 * 60 * 1000;

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export interface TeamRow {
    user: UserItem;
    collectionsToday: number;
    lastAt: Date | null;
    inField: boolean;
}

/** Equipe da empresa com as coletas de hoje; quem está em campo vem primeiro. */
export function buildTeamRows(snapshot: Pick<FieldSnapshot, "researchers" | "collections">, now: number): TeamRow[] {
    const today = new Date(now);
    const byUser = new Map<number, { count: number; last: Date | null }>();

    for (const c of snapshot.collections) {
        const entry = byUser.get(c.researcherId) ?? { count: 0, last: null };
        if (isSameDay(c.at, today)) entry.count += 1;
        if (!entry.last || c.at > entry.last) entry.last = c.at;
        byUser.set(c.researcherId, entry);
    }

    return snapshot.researchers
        .map((user): TeamRow => {
            const entry = byUser.get(user.id);
            const lastAt = entry?.last ?? null;
            return {
                user,
                collectionsToday: entry?.count ?? 0,
                lastAt,
                inField: !!lastAt && now - lastAt.getTime() <= IN_FIELD_WINDOW_MS && lastAt.getTime() <= now + 60_000,
            };
        })
        .sort(
            (a, b) =>
                Number(b.inField) - Number(a.inField) ||
                b.collectionsToday - a.collectionsToday ||
                a.user.name.localeCompare(b.user.name, "pt-BR")
        );
}

/* ------------------------------------------------------------------
   Mapa de calor: dia da semana x horário
   ------------------------------------------------------------------ */

export const HEAT_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
export const HEAT_DAY_NAMES = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"] as const;
export const HEAT_FIRST_HOUR = 8;
export const HEAT_HOURS = 12;
const HEAT_WINDOW_DAYS = 28;

export interface Heatmap {
    /** cells[dia][coluna] = coletas; dia 0 = segunda, coluna 0 = 8h. */
    cells: number[][];
    /** Nível de cor (0 a 4) de cada célula. */
    levels: number[][];
    total: number;
    /** Coletas fora da faixa de horários exibida. */
    outside: number;
    peak: { day: number; hour: number; count: number } | null;
}

export function buildHeatmap(collections: FieldCollection[], now: number): Heatmap {
    const cells = HEAT_DAYS.map(() => new Array<number>(HEAT_HOURS).fill(0));
    const since = now - HEAT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    let total = 0;
    let outside = 0;

    for (const c of collections) {
        if (c.at.getTime() < since || c.at.getTime() > now + 60_000) continue;
        total += 1;
        const day = (c.at.getDay() + 6) % 7;
        const col = c.at.getHours() - HEAT_FIRST_HOUR;
        if (col < 0 || col >= HEAT_HOURS) {
            outside += 1;
            continue;
        }
        cells[day][col] += 1;
    }

    let peak: Heatmap["peak"] = null;
    cells.forEach((row, day) =>
        row.forEach((count, col) => {
            if (count > 0 && (!peak || count > peak.count)) peak = { day, hour: col + HEAT_FIRST_HOUR, count };
        })
    );

    const max = (peak as Heatmap["peak"])?.count ?? 0;
    const levels = cells.map((row) => row.map((count) => (count === 0 || max === 0 ? 0 : Math.ceil((count / max) * 4))));

    return { cells, levels, total, outside, peak };
}

/* ------------------------------------------------------------------
   Pesquisas: período e andamento
   ------------------------------------------------------------------ */

/** "2026-10-01" ou ISO -> data local, sem o deslocamento de fuso que `new Date("2026-10-01")` causa. */
export function parseCalendarDate(raw?: string): Date | null {
    if (!raw) return null;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "01/10 a 30/11" (com o ano quando as datas não são do ano atual). */
export function formatPeriod(start?: string, end?: string, now = new Date()): string {
    const s = parseCalendarDate(start);
    const e = parseCalendarDate(end);
    if (!s || !e) return "Período não definido";
    const sameYear = s.getFullYear() === now.getFullYear() && e.getFullYear() === now.getFullYear();
    const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}${sameYear ? "" : `/${d.getFullYear()}`}`;
    return `${fmt(s)} a ${fmt(e)}`;
}

/** Dias de calendário até o último dia da pesquisa (0 = termina hoje; negativo = já terminou). */
export function daysUntilEnd(end: string | undefined, now: number): number | null {
    const e = parseCalendarDate(end);
    if (!e) return null;
    const today = new Date(now);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return Math.round((new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime() - startOfToday) / 86_400_000);
}

/** Quanto do período da pesquisa já passou, de 0 a 1. */
export function periodProgress(research: Pick<Research, "status" | "startDate" | "endDate">, now: number): number {
    if (research.status === "CLOSED") return 1;
    const s = parseCalendarDate(research.startDate);
    const e = parseCalendarDate(research.endDate);
    if (!s || !e) return 0;
    const end = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1).getTime();
    const span = end - s.getTime();
    if (span <= 0) return 0;
    return Math.max(0, Math.min(1, (now - s.getTime()) / span));
}

/* ------------------------------------------------------------------
   Apresentação de pessoas
   ------------------------------------------------------------------ */

export const initialsOf = (name?: string) =>
    (name ?? "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "?";

/** Cor fixa do avatar de cada pessoa (a1 a a4, definidas no CSS). */
export const avatarTone = (id: number) => `a${(Math.abs(id) % 4) + 1}`;
