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

const DELETE_USER_ERRORS: Record<string, string> = {
    'Only superadministrators can delete users': 'Somente o superadministrador pode excluir usuários.',
    'You cannot delete your own account': 'Você não pode excluir a sua própria conta.',
    'Superadministrators cannot be deleted': 'Não é possível excluir um superadministrador.',
    'User not found': 'Usuário não encontrado. Atualize a lista e tente novamente.',
};

export const deleteUser = async (username: string) => {
    const response = await apiFetch(`/user/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = typeof errorBody?.message === 'string' ? errorBody.message : '';
        throw new Error(DELETE_USER_ERRORS[message] ?? 'Falha ao excluir usuário');
    }

    return response.json();
}

export interface UserItem {
    id: number;
    name: string;
    username: string;
    profile: 'SUPERADMINISTRATOR' | 'ADMINISTRATOR' | 'RESEARCHER';
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
