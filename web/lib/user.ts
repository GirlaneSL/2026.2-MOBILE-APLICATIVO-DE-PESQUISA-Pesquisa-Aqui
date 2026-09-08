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

export const deleteUser = async (username: string) => {
    const response = await apiFetch(`/user/${username}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to delete user');

    return response.json();
}
