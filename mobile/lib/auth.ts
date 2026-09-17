import { API_BASE_URL, apiFetch } from './api';
import { saveToken, getToken, clearToken } from './secureStorage';
import { clearResearchesCache } from './researchCache';

export interface CurrentUser {
    sub: string;
    name: string;
    profile: 'SUPERADMINISTRATOR' | 'ADMINISTRATOR' | 'RESEARCHER';
    companyId: number | null;
    companyName: string | null;
}

export async function login(username: string, password: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            password,
            platform: 'mobile'
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(errorData.message || 'Usuário ou senha inválidos.');
    }

    const data = await response.json();

    if (!data.access_token) {
        throw new Error('Não foi possível concluir o login.');
    }

    await saveToken(data.access_token);
}

export async function isLoggedIn(): Promise<boolean> {
    const token = await getToken();
    return !!token;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
    try {
        const response = await apiFetch('/auth/me');
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export async function logout(): Promise<void> {
    await clearToken();
    await clearResearchesCache();
}