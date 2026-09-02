export const login = async (username: string, password: string) => {
    const response = await fetch(`http://localhost:3001/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })

    if (!response.ok) throw new Error('Invalid credentials');

    return response.json()
}