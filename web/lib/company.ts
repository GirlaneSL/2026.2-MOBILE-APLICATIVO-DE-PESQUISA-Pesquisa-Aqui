export const createCompany = async (
    legalName: string,
    contactInformation: string,
    situation: 'ACTIVE' | 'INACTIVE'
) => {
    const token = localStorage.getItem('access_token');

    const response = await fetch(
        `http://localhost:3001/company`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                legalName,
                contactInformation,
                situation
            })
        }
    );

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Failed to create company');
    }

    return response.json();
}