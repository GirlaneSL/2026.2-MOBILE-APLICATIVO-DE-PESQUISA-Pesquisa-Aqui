export const createUser = async (
    name: string,
    username: string,
    password: string,
    profile: 'SUPERADMINISTRATOR' | 'ADMINISTRATOR' | 'RESEARCHER' | '',
    companyId?: number
) => {
    const token = localStorage.getItem('access_token');

    const response = await fetch(
        `http://localhost:3001/user`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
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