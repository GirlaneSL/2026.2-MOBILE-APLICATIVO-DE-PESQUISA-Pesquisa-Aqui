interface Research {
    id: number;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "IN_FIELD" | "CLOSED";
    startDate: string;
    endDate: string;
    companyId: number;
}

const ACTIVE_STATUSES: Research["status"][] = ["IN_FIELD"];

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

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

export function getActiveResearchesInMonth(
    researches: Research[],
    month: number,
    year: number
): Research[] {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    return researches.filter((r) => {
        if (!ACTIVE_STATUSES.includes(r.status)) return false;

        const start = new Date(r.startDate);
        const end = new Date(r.endDate);

        return start <= monthEnd && end >= monthStart;
    });
}

export function getResearchesByMonth(
    researches: Research[],
    year: number
): { month: string; Pesquisas: number }[] {
    return MONTH_NAMES.map((month, i) => {
        const activeInThisMonth = getActiveResearchesInMonth(researches, i + 1, year);
        return { month, Pesquisas: activeInThisMonth.length };
    });
}