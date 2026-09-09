import { apiFetch } from "./apiFetcher";

export interface AuthUser {
    sub: string;
    name: string;
    profile: 'SUPERADMINISTRATOR' | 'ADMINISTRATOR' | 'RESEARCHER';
    companyId: number;
}

export const login = async (username: string, password: string) => {
    const response = await apiFetch(`/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
    })

    if (!response.ok) throw new Error('Invalid credentials');

    return response.json()
}

export const logout = async () => {
    try {
        await apiFetch(`/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
    } catch (error) {
        console.log('Failed to notify backend about logout', error);
    }

    window.location.href = '/login';
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
    try {
        const response = await apiFetch(`/auth/me`, {
            method: 'GET',
            credentials: 'include',
        });

        if (response.status === 401) {
            await logout();
            return null;
        }

        if (!response.ok) {
            console.error('getCurrentUser failed:', response.status, await response.text());
            return null;
        }

        return response.json();
    } catch (error) {
        console.error('Failed to apiFetch current user:', error);
        return null;
    }
};