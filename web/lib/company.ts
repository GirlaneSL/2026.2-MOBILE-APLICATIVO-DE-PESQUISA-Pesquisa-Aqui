import { apiFetch } from "./apiFetcher";
import { asPage, pageQuery, type Page, type PageParams } from "./pagination";

export interface CompanyItem {
    id: number;
    legalName: string;
    contactInformation: string;
    situation: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
    updatedAt?: string;
}

export const createCompany = async (
    legalName: string,
    contactInformation: string,
    situation: 'ACTIVE' | 'INACTIVE'
) => {
    const response = await apiFetch(
        `/company`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                legalName,
                contactInformation,
                situation
            })
        }
    );

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Failed to create company');
    }

    return response.json();
}

export const getCompanies = async () => {
    const response = await apiFetch('/company', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to get companies');

    return response.json();
}

export const deactivate = async (id: number) => {
    const response = await apiFetch(`/company/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    })

    if (!response.ok) throw new Error('Failed to deactivate company')

    return response.json();
}

const COMPANY_ERRORS: Record<string, string> = {
    'Only super administrators can edit companies.': 'Somente o superadministrador pode editar empresas.',
    'Only super administrators can delete companies.': 'Somente o superadministrador pode excluir empresas.',
    'Company not found': 'Empresa não encontrada. Atualize a lista e tente novamente.',
    'Company has linked users or researches and cannot be deleted':
        'Esta empresa possui usuários ou pesquisas vinculados e não pode ser excluída. Desative-a em vez disso.',
};

const companyError = async (response: Response, fallback: string) => {
    const errorBody = await response.json().catch(() => null);
    const message = typeof errorBody?.message === 'string' ? errorBody.message : '';
    return new Error(COMPANY_ERRORS[message] ?? fallback);
};

export interface UpdateCompanyInput {
    legalName?: string;
    contactInformation?: string;
    situation?: 'ACTIVE' | 'INACTIVE';
}

export const updateCompany = async (id: number, input: UpdateCompanyInput): Promise<CompanyItem> => {
    const response = await apiFetch(`/company/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(input),
    });

    if (!response.ok) throw await companyError(response, 'Falha ao atualizar empresa');

    return response.json();
}

export const deleteCompany = async (id: number) => {
    const response = await apiFetch(`/company/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok) throw await companyError(response, 'Falha ao excluir empresa');

    return response.json();
}

/** Uma página de empresas (busca, situação e ordem no servidor). */
export const getCompaniesPage = async (params: PageParams & { situation?: CompanyItem['situation'] }): Promise<Page<CompanyItem>> => {
    const response = await apiFetch(`/company${pageQuery(params)}`, { method: 'GET', credentials: 'include' });
    if (!response.ok) throw new Error('Failed to get companies');
    return asPage<CompanyItem>(await response.json(), params);
}

export interface CompanyStats {
    year: number;
    companies: number;
    activeCompanies: number;
    inactiveCompanies: number;
    admins: number;
    /** Cadastros por mês no ano (12 números). */
    companiesByMonth: number[];
    adminsByMonth: number[];
    /** As empresas mais novas (para o painel). */
    recentCompanies: { id: number; legalName: string; situation: 'ACTIVE' | 'INACTIVE' }[];
    /** Atividades mais recentes (empresas e administradores). */
    activities: { id: string; kind: 'company' | 'admin' | 'research' | 'researcher'; message: string; date: string }[];
}

/** Totais da tela de empresas, sem trazer as listas. */
export const getCompanyStats = async (): Promise<CompanyStats> => {
    const response = await apiFetch('/company/stats', { method: 'GET', credentials: 'include' });
    if (!response.ok) throw new Error('Falha ao carregar os números das empresas');
    return response.json();
}

/** Empresas ativas no formato do <RemoteComboBox> (value = id, label = razão social): pesquisa e página vêm do servidor. */
export const getCompanyOptions = async (params: { page: number; pageSize: number; q: string }) => {
    const page = await getCompaniesPage({ ...params, situation: 'ACTIVE', sort: 'name' });
    return { ...page, items: page.items.map((company) => ({ value: String(company.id), label: company.legalName })) };
}
