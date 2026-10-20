import { getCollections, type CollectionSummary } from "./collection";
import { getCompanies, type CompanyItem } from "./company";
import { getResearches, type Research } from "./research";
import { getResearchers, getUsersAdmin, type UserItem } from "./user";

/**
 * Buscador global: reúne em uma lista única as páginas do painel e os registros
 * que o perfil logado pode ver (pesquisas, pesquisadores, empresas, administradores)
 * e faz a busca no próprio navegador, sem acento e sem diferenciar maiúsculas.
 */

export type SearchProfile = "SUPERADMINISTRATOR" | "ADMINISTRATOR" | "RESEARCHER";

export type SearchKind = "page" | "research" | "collection" | "researcher" | "company" | "admin";

export interface SearchEntry {
    /** Identificador único (ex.: "research:12"). */
    key: string;
    kind: SearchKind;
    title: string;
    /** Linha menor abaixo do título. */
    subtitle?: string;
    /** Texto adicional que também é pesquisado, mas não aparece. */
    extra?: string;
    /** Número que, digitado por inteiro (ex.: "12" ou "#12"), põe o resultado no topo. */
    code?: string;
    href: string;
    /** Rótulo da situação (ex.: "Em campo"), mostrado como selo. */
    badge?: string;
    badgeTone?: "live" | "draft" | "closed" | "off";
}

export const KIND_LABELS: Record<SearchKind, string> = {
    page: "Páginas",
    research: "Pesquisas",
    collection: "Coletas",
    researcher: "Pesquisadores",
    company: "Empresas",
    admin: "Administradores",
};

/** Ordem em que os grupos aparecem nos resultados. */
export const KIND_ORDER: SearchKind[] = ["page", "research", "collection", "researcher", "company", "admin"];

const STATUS_LABELS: Record<Research["status"], { label: string; tone: SearchEntry["badgeTone"] }> = {
    DRAFT: { label: "Rascunho", tone: "draft" },
    PUBLISHED: { label: "Publicada", tone: "live" },
    IN_FIELD: { label: "Em campo", tone: "live" },
    CLOSED: { label: "Encerrada", tone: "closed" },
};

/* ------------------------------------------------------------------
   Carregamento dos registros
   ------------------------------------------------------------------ */

const CACHE_TTL_MS = 60_000;

let cache: { profile: SearchProfile; entries: SearchEntry[]; at: number } | null = null;
let inFlight: { profile: SearchProfile; promise: Promise<SearchEntry[]> } | null = null;

const researchEntry = (r: Research): SearchEntry => {
    const status = STATUS_LABELS[r.status];
    return {
        key: `research:${r.id}`,
        kind: "research",
        title: r.title,
        subtitle: r.objective || r.description || undefined,
        extra: [r.description, r.targetAudience, status?.label].filter(Boolean).join(" "),
        href: `/pesquisas/${r.id}`,
        badge: status?.label,
        badgeTone: status?.tone,
    };
};

const pad = (n: number) => String(n).padStart(2, "0");

const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const collectionEntry = (c: CollectionSummary, research: Research): SearchEntry => {
    const when = formatDateTime(c.finishedAt || c.startedAt);
    return {
        key: `collection:${c.id}`,
        kind: "collection",
        title: `Coleta #${c.id}`,
        subtitle: [research.title, c.researcherName, when].filter(Boolean).join(" · "),
        extra: `${c.researcherName ?? ""} ${research.title}`,
        code: String(c.id),
        // Abre a pesquisa já na aba de coletas e com esta coleta aberta.
        href: `/pesquisas/${research.id}?aba=coletas&coleta=${c.id}`,
    };
};

const researcherEntry = (u: UserItem): SearchEntry => ({
    key: `researcher:${u.id}`,
    kind: "researcher",
    title: u.name,
    subtitle: `@${u.username}`,
    extra: u.username,
    href: "/pesquisadores",
});

const adminEntry = (u: UserItem): SearchEntry => ({
    key: `admin:${u.id}`,
    kind: "admin",
    title: u.name,
    subtitle: `@${u.username}`,
    extra: u.username,
    href: "/empresas",
});

const companyEntry = (c: CompanyItem): SearchEntry => ({
    key: `company:${c.id}`,
    kind: "company",
    title: c.legalName,
    subtitle: c.contactInformation || undefined,
    extra: c.situation === "ACTIVE" ? "ativa" : "inativa",
    href: "/empresas",
    badge: c.situation === "ACTIVE" ? "Ativa" : "Inativa",
    badgeTone: c.situation === "ACTIVE" ? "live" : "off",
});

async function fetchEntries(profile: SearchProfile): Promise<SearchEntry[]> {
    // Cada fonte é independente: se uma falhar, as outras continuam aparecendo.
    const settled = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
        try {
            return await promise;
        } catch (error) {
            if (error instanceof Error && error.message === "Session expired") throw error;
            console.error("Busca global: falha ao carregar uma fonte", error);
            return fallback;
        }
    };

    if (profile === "SUPERADMINISTRATOR") {
        const [companies, admins] = await Promise.all([
            settled<CompanyItem[]>(getCompanies(), []),
            settled<UserItem[]>(getUsersAdmin(), []),
        ]);
        return [...(companies ?? []).map(companyEntry), ...(admins ?? []).map(adminEntry)];
    }

    if (profile === "ADMINISTRATOR") {
        const [researches, researchers] = await Promise.all([
            settled<Research[]>(getResearches(), []),
            settled<UserItem[]>(getResearchers(), []),
        ]);
        const list = researches ?? [];

        // A API lista as coletas por pesquisa. Rascunho ainda não recebe coletas.
        const withCollections = list.filter((r) => r.status !== "DRAFT");
        const collectionResults = await Promise.allSettled(withCollections.map((r) => getCollections(r.id)));
        const collections: SearchEntry[] = [];
        collectionResults.forEach((result, i) => {
            if (result.status === "rejected") {
                if (result.reason instanceof Error && result.reason.message === "Session expired") throw result.reason;
                return;
            }
            for (const c of result.value) collections.push(collectionEntry(c, withCollections[i]));
        });

        return [...list.map(researchEntry), ...(researchers ?? []).map(researcherEntry), ...collections];
    }

    const researches = await settled<Research[]>(getResearches(), []);
    return (researches ?? []).map(researchEntry);
}

/** Carrega (ou reaproveita por 1 minuto) os registros pesquisáveis do perfil. */
export function loadSearchEntries(profile: SearchProfile): Promise<SearchEntry[]> {
    if (cache && cache.profile === profile && Date.now() - cache.at < CACHE_TTL_MS) {
        return Promise.resolve(cache.entries);
    }
    if (inFlight && inFlight.profile === profile) return inFlight.promise;

    const promise = fetchEntries(profile)
        .then((entries) => {
            cache = { profile, entries, at: Date.now() };
            return entries;
        })
        .finally(() => {
            if (inFlight?.promise === promise) inFlight = null;
        });
    inFlight = { profile, promise };
    return promise;
}

/** Descarta o cache (útil ao sair da conta ou depois de cadastrar algo). */
export function clearSearchCache() {
    cache = null;
}

/* ------------------------------------------------------------------
   Busca
   ------------------------------------------------------------------ */

/** Minúsculas e sem acento, mantendo o mapa de posições para destacar o texto original. */
function fold(text: string): { folded: string; map: number[] } {
    let folded = "";
    const map: number[] = [];
    let index = 0;
    for (const char of text) {
        const plain = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        for (let i = 0; i < plain.length; i += 1) map.push(index);
        folded += plain;
        index += char.length;
    }
    return { folded, map };
}

export const normalizeText = (text: string) => fold(text).folded;

// "#12" vale como "12": o número da coleta aparece com "#" na tela.
const tokensOf = (query: string) =>
    normalizeText(query)
        .split(/\s+/)
        .map((token) => token.replace(/^#+/, ""))
        .filter(Boolean);

/** 0 = não encontrou. Início do texto > início de palavra > meio do texto. */
function scoreField(folded: string, token: string): number {
    const at = folded.indexOf(token);
    if (at < 0) return 0;
    if (at === 0) return 100;
    const before = folded[at - 1];
    return /[\s\-_./@(#]/.test(before) ? 70 : 40;
}

export interface SearchResult {
    entry: SearchEntry;
    score: number;
}

/**
 * Todas as palavras digitadas precisam aparecer (no título, no subtítulo ou no texto extra).
 * O título pesa mais que o resto, e as páginas ganham um pequeno impulso.
 */
export function searchEntries(entries: SearchEntry[], query: string, perKind = 6): SearchResult[] {
    const tokens = tokensOf(query);
    if (tokens.length === 0) return [];

    const results: SearchResult[] = [];
    for (const entry of entries) {
        const title = normalizeText(entry.title);
        const subtitle = normalizeText(entry.subtitle ?? "");
        const extra = normalizeText(entry.extra ?? "");

        let total = 0;
        let matchedAll = true;
        for (const token of tokens) {
            const inTitle = scoreField(title, token);
            const best = Math.max(
                inTitle * 3,
                scoreField(subtitle, token) * 1.5,
                scoreField(extra, token)
            );
            if (best === 0) {
                matchedAll = false;
                break;
            }
            total += best;
        }
        if (!matchedAll) continue;

        if (title === tokens.join(" ")) total += 200;
        if (entry.code && tokens.includes(entry.code)) total += 300;
        if (entry.kind === "page") total += 15;
        results.push({ entry, score: total });
    }

    results.sort(
        (a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "pt-BR")
    );

    // Limita cada grupo para que um tipo com muitos acertos não esconda os demais.
    const taken: Record<string, number> = {};
    const limited = results.filter(({ entry }) => {
        taken[entry.kind] = (taken[entry.kind] ?? 0) + 1;
        return taken[entry.kind] <= perKind;
    });

    // Reagrupa na ordem fixa dos grupos, mantendo a ordem de relevância dentro de cada um.
    return KIND_ORDER.flatMap((kind) => limited.filter((r) => r.entry.kind === kind));
}

/** Trechos do texto original que casam com a busca, para destacar. */
export function highlightRanges(text: string, query: string): Array<[number, number]> {
    const tokens = tokensOf(query);
    if (tokens.length === 0 || !text) return [];

    const { folded, map } = fold(text);
    const ranges: Array<[number, number]> = [];

    for (const token of tokens) {
        let from = 0;
        for (;;) {
            const at = folded.indexOf(token, from);
            if (at < 0) break;
            const start = map[at];
            const lastChar = map[at + token.length - 1];
            // O fim é o começo do caractere seguinte no texto original.
            const end = at + token.length < map.length ? map[at + token.length] : text.length;
            ranges.push([start, Math.max(end, lastChar + 1)]);
            from = at + token.length;
        }
    }

    // Junta trechos que se sobrepõem.
    ranges.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const range of ranges) {
        const last = merged[merged.length - 1];
        if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
        else merged.push([range[0], range[1]]);
    }
    return merged;
}
