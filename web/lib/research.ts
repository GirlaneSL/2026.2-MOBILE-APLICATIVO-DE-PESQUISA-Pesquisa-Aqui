export const createResearch = async (title: string, description: string, objective: string, startDate: string, endDate: string, targetAudience: string) => {
    const token = localStorage.getItem('access_token');

    const response = await fetch(
        `http://localhost:3001/research`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                title,
                description,
                objective,
                startDate,
                endDate,
                targetAudience,
            })
        }
    );

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Failed to create user');
    }

    return response.json();
}

export const getResearches = async () => {
    const token = localStorage.getItem('access_token');

    const response = await fetch('http://localhost:3001/research', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) throw new Error('Failed to get companies');

    return response.json();
}
