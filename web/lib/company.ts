import { apiFetch } from "./apiFetcher";

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
