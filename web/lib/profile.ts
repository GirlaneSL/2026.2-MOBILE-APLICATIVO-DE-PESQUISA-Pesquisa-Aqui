import { apiFetch } from "./apiFetcher";
import { notifyUserUpdated } from "./auth";
import type { UserItem } from "./user";

/** Perfil do usuário logado (GET /auth/profile). */
export type ProfileData = UserItem & { companyName: string | null };

export interface UpdateProfileInput {
    name?: string;
    username?: string;
    /** Obrigatória quando a senha é trocada. */
    currentPassword?: string;
    newPassword?: string;
}

const PROFILE_ERRORS: Record<string, string> = {
    'Username already exists': 'Este nome de usuário já está em uso.',
    'Current password is required': 'Informe a senha atual para trocar a senha.',
    'Current password is incorrect': 'A senha atual está incorreta.',
    'Researchers cannot edit their own profile': 'Pesquisadores não podem editar o próprio perfil. Fale com o administrador da empresa.',
    'User not found': 'Usuário não encontrado. Entre novamente.',
};

const profileError = async (response: Response, fallback: string) => {
    const errorBody = await response.json().catch(() => null);
    // O validador da API devolve uma lista de mensagens quando um campo é inválido.
    const message = Array.isArray(errorBody?.message) ? errorBody.message[0] : errorBody?.message;
    return new Error(PROFILE_ERRORS[typeof message === 'string' ? message : ''] ?? fallback);
};

export const getProfile = async (): Promise<ProfileData> => {
    const response = await apiFetch('/auth/profile', { method: 'GET', credentials: 'include' });

    if (!response.ok) throw await profileError(response, 'Falha ao carregar o perfil');

    return response.json();
};

/** Salva nome, usuário e/ou senha do próprio usuário. A API renova o cookie de sessão. */
export const updateProfile = async (input: UpdateProfileInput): Promise<ProfileData> => {
    const response = await apiFetch('/auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify(input),
    });

    if (!response.ok) throw await profileError(response, 'Falha ao salvar o perfil');

    const profile: ProfileData = await response.json();
    notifyUserUpdated();

    return profile;
};
