import { logout } from "./auth";

const API_BASE_URL = "http://localhost:3001";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (response.status === 401) {
        await logout();
        throw new Error('Session expired');
    }

    return response;
}

export function isSessionExpiredError(error: unknown): boolean {
    return error instanceof Error && error.message === 'Session expired';
}