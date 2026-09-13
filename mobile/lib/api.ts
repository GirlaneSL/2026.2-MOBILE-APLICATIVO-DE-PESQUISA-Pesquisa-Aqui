import { router } from "expo-router";
import { clearToken, getToken } from "./secureStorage";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}${path}`, {
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