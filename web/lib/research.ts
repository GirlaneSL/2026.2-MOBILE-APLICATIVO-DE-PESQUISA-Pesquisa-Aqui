export interface Research {
    id: number;
    title: string;
    description: string;
    objective: string;
    status: "DRAFT" | "PUBLISHED" | "IN_FIELD" | "CLOSED";
    startDate: string;
    endDate: string;
    targetAudience: string;
    companyId: number;
}

const ACTIVE_STATUSES: Research["status"][] = ["IN_FIELD"];

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export const createResearch = async (title: string, description: string, objective: string, startDate: string, endDate: string, targetAudience: string) => {
    const response = await fetch(
        `http://localhost:3001/research`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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

export const getResearches = async (): Promise<Research[]> => {
    const response = await fetch('http://localhost:3001/research', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        console.error('getResearches failed:', response.status, errorBody);
        throw new Error(errorBody?.message || `Failed to get researches (status ${response.status})`);
    }

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

export const getResearchById = async (id: string): Promise<Research> => {
    const response = await fetch(`http://localhost:3001/research/${id}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const error = new Error(errorBody?.message || 'Failed to get research') as Error & { status?: number };
        error.status = response.status;
        throw error;
    }

    return response.json();
};

export const deleteResearch = async (id: number): Promise<void> => {
    const response = await fetch(`http://localhost:3001/research/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Failed to delete research');
    }
}
