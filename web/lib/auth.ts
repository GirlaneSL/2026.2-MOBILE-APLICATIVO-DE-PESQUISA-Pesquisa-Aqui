export const login = async (username: string, password: string) => {
    const response = await fetch(`http://localhost:3001/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })

    if (!response.ok) throw new Error('Invalid credentials');

    return response.json()
}

export const logout = async () => {
    const token = localStorage.getItem('access_token');

    try {
        await fetch(`http://localhost:3001/auth/logout`, {

            method: 'POST',
            headers: {
                'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
            },
        });
    } catch (error) {
        console.log('Failed to notify backend about logout', error);
    }

    localStorage.removeItem('access_token');
    window.location.href = '/login';
}
