export const createCompany = async (
    legalName: string,
    contactInformation: string,
    situation: 'ACTIVE' | 'INACTIVE'
) => {
    const response = await fetch(
        `http://localhost:3001/company`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
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

export const getCompanies = async () => {
    const response = await fetch('http://localhost:3001/company', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to get companies');

    return response.json();
}

export const deactivate = async (id: number) => {
    const response = await fetch(`http://localhost:3001/company/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    })

    if (!response.ok) throw new Error('Failed to deactivate company')

    return response.json();
}
