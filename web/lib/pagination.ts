// Paginação no servidor: a API devolve só uma página por vez ({ items, total, ... }) e nunca mais
// que MAX_PAGE_SIZE itens. Estes tipos e o montador de query são usados por todos os fetchers de lista.

export interface Page<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/** Teto da API por página (o servidor recusa mais que isso). */
export const MAX_PAGE_SIZE = 100;

export interface PageParams {
    page?: number;
    pageSize?: number;
    /** Busca por texto (o servidor procura sem diferenciar maiúsculas e acentos). */
    q?: string;
    sort?: "recent" | "name" | "deadline";
}

/** Monta "?page=1&pageSize=10&..." ignorando o que está vazio. Sempre envia page e pageSize. */
export function pageQuery<P extends PageParams>(params: P, extra: Record<string, string | number | undefined> = {}): string {
    const merged: { [key: string]: unknown } = {
        ...(params as unknown as { [key: string]: unknown }),
        ...extra,
        page: params.page ?? 1,
        pageSize: Math.min(params.pageSize ?? 10, MAX_PAGE_SIZE),
    };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
        if (value === undefined || value === "") continue;
        search.set(key, String(value));
    }
    return `?${search.toString()}`;
}

/**
 * Lê uma resposta de lista. Aceita o formato novo (página) e o antigo (array inteiro): se o servidor
 * ainda não foi atualizado, a tela continua funcionando e a página é recortada aqui.
 */
export function asPage<T>(data: unknown, params: PageParams): Page<T> {
    if (Array.isArray(data)) {
        const pageSize = Math.min(params.pageSize ?? 10, MAX_PAGE_SIZE);
        const page = params.page ?? 1;
        return {
            items: data.slice((page - 1) * pageSize, page * pageSize) as T[],
            total: data.length,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(data.length / pageSize)),
        };
    }
    return data as Page<T>;
}
