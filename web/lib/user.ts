import { apiFetch } from "./apiFetcher";

export const createUser = async (
    name: string,
    username: string,
    password: string,
    profile: 'SUPERADMINISTRATOR' | 'ADMINISTRATOR' | 'RESEARCHER' | '',
    companyId?: number
) => {
    const response = await apiFetch(
        `/user`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                name,
                username,
                password,
                profile,
                companyId,
            })
        }
    );

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Failed to create user');
    }

    return response.json();
}

export const getUsersAdmin = async () => {
    const response = await apiFetch('/user/admins', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to get admins');

    return response.json();
}

const USER_ERRORS: Record<string, string> = {
    'Researchers cannot manage users': 'Pesquisadores não podem gerenciar usuários.',
    'Administrators can only manage researchers from their own company': 'Você só pode gerenciar pesquisadores da sua própria empresa.',
    'You cannot delete your own account': 'Você não pode excluir a sua própria conta.',
    'Superadministrators cannot be deleted': 'Não é possível excluir um superadministrador.',
    'Superadministrators cannot be edited': 'Não é possível editar um superadministrador.',
    'Superadministrators cannot be deactivated': 'Não é possível desativar um superadministrador.',
    'You cannot deactivate your own account': 'Você não pode desativar a sua própria conta.',
    'User has collected data and cannot be deleted': 'Este usuário já possui coletas registradas e não pode ser excluído.',
    'Username already exists': 'Este nome de usuário já está em uso.',
    'User not found': 'Usuário não encontrado. Atualize a lista e tente novamente.',
};

const userError = async (response: Response, fallback: string) => {
    const errorBody = await response.json().catch(() => null);
    const message = typeof errorBody?.message === 'string' ? errorBody.message : '';
    return new Error(USER_ERRORS[message] ?? fallback);
};

export const deleteUser = async (username: string) => {
    const response = await apiFetch(`/user/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok) throw await userError(response, 'Falha ao excluir usuário');

    return response.json();
}

export const setUserSituation = async (username: string, situation: UserSituation): Promise<UserItem> => {
    const response = await apiFetch(`/user/${encodeURIComponent(username)}/situation`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ situation }),
    });

    if (!response.ok) throw await userError(response, 'Falha ao alterar a situação do usuário');

    return response.json();
}

export interface UpdateUserInput {
    name?: string;
    username?: string;
    /** Só enviar quando a senha for trocada. */
    password?: string;
}

export const updateUser = async (username: string, input: UpdateUserInput): Promise<UserItem> => {
    const response = await apiFetch(`/user/${encodeURIComponent(username)}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(input),
    });

    if (!response.ok) throw await userError(response, 'Falha ao atualizar usuário');

    return response.json();
}

export type UserSituation = 'ACTIVE' | 'INACTIVE';

export interface UserItem {
    id: number;
    name: string;
    username: string;
    profile: 'SUPERADMINISTRATOR' | 'ADMINISTRATOR' | 'RESEARCHER';
    /** Ausente em respostas antigas: tratar como ACTIVE. */
    situation?: UserSituation;
    companyId: number | null;
    createdAt?: string;
    updatedAt?: string;
}

export const getUsers = async (): Promise<UserItem[]> => {
    const response = await apiFetch('/user', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw new Error('Falha ao carregar usuários');

    return response.json();
}

export const getResearchers = async (): Promise<UserItem[]> => {
    const users = await getUsers();
    return users.filter((u) => u.profile === 'RESEARCHER');
}
