import { API_BASE_URL, apiFetch } from './api';
import { saveToken, getToken, clearToken } from './secureStorage';
import { clearResearchesCache } from './researchCache';
import { returnAllCopies } from './researchReturn';
import { filePart } from './collectionUpload';

export interface CurrentUser {
    sub: string;
    name: string;
    profile: 'SUPERADMINISTRATOR' | 'ADMINISTRATOR' | 'RESEARCHER';
    companyId: number | null;
    companyName: string | null;
    /** Foto de perfil (endereço no Cloudinary); nulo = sem foto. */
    avatarUrl?: string | null;
    /** Logo da empresa (endereço no Cloudinary); nulo = sem logo. */
    companyLogoUrl?: string | null;
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
    // Antes de apagar o token (a API precisa dele): devolve as cópias, para o contador de cópias do servidor cair.
    await returnAllCopies().catch(() => undefined);
    await clearToken();
    await clearResearchesCache();
}

async function readError(response: Response, fallback: string): Promise<string> {
    const data = await response.json().catch(() => ({}));
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    return typeof message === 'string' && message ? message : fallback;
}

/** Envia a foto de perfil (JPEG já reduzido, no aparelho). A API troca a foto do próprio usuário logado. */
export async function uploadAvatar(uri: string): Promise<void> {
    const form = new FormData();
    form.append('file', filePart(uri, 'avatar.jpg', 'image/jpeg'));

    const response = await apiFetch('/auth/avatar', { method: 'POST', body: form });

    if (!response.ok) throw new Error(await readError(response, 'Não foi possível enviar a foto. Tente novamente.'));
}

/** Remove a foto de perfil: o app volta a mostrar as iniciais. */
export async function removeAvatar(): Promise<void> {
    const response = await apiFetch('/auth/avatar', { method: 'DELETE' });

    if (!response.ok) throw new Error(await readError(response, 'Não foi possível remover a foto. Tente novamente.'));
}
