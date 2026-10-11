import { router } from "expo-router";
import { clearToken, getToken } from "./secureStorage";

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Remove espaços, aspas acidentais e barras no final
export const API_BASE_URL = rawBaseUrl.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await getToken();

    // Garante que o path comece com uma barra única e sem espaços
    const cleanPath = path.trim().startsWith('/') ? path.trim() : `/${path.trim()}`;
    const url = `${API_BASE_URL}${cleanPath}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (response.status === 401) {
        await clearToken();
        router.replace('/login');
        throw new ApiError('Session expired', 401);
    }

    return response;
}