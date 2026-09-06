export interface AuthUser {
    sub: string;
    name: string;
    profile: 'SUPERADMINISTRATOR' | 'ADMINISTRATOR' | 'RESEARCHER';
    companyId: number;
}

export const login = async (username: string, password: string) => {
    const response = await fetch(`http://localhost:3001/auth/login`, {
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
        await fetch(`http://localhost:3001/auth/logout`, {
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
        const response = await fetch(`http://localhost:3001/auth/me`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            console.error('getCurrentUser failed:', response.status, await response.text());
            return null;
        }

        return response.json();
    } catch (error) {
        console.error('Failed to fetch current user:', error);
        return null;
    }
};
