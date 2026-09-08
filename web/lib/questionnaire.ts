import { Question } from "@/app/(sidebar)/pesquisas/components/MontarPesquisaForm";

export type FrontendQuestionType =
    | "text" | "number" | "date" | "time" | "boolean"
    | "single-choice" | "multiple-choice" | "rating-1-5"
    | "photo" | "multiple-photos" | "location" | "audio";

export type BackendQuestionType =
    | "FREE_TEXT" | "NUMERIC" | "DATE" | "TIME" | "YES_NO"
    | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SCALE_1_5"
    | "PHOTO" | "MULTIPLE_PHOTOS" | "LOCATION" | "AUDIO";

const TYPE_TO_BACKEND: Record<FrontendQuestionType, BackendQuestionType> = {
    "text": "FREE_TEXT",
    "number": "NUMERIC",
    "date": "DATE",
    "time": "TIME",
    "boolean": "YES_NO",
    "single-choice": "SINGLE_CHOICE",
    "multiple-choice": "MULTIPLE_CHOICE",
    "rating-1-5": "SCALE_1_5",
    "photo": "PHOTO",
    "multiple-photos": "MULTIPLE_PHOTOS",
    "location": "LOCATION",
    "audio": "AUDIO",
};

const TYPE_FROM_BACKEND: Record<BackendQuestionType, FrontendQuestionType> = {
    "FREE_TEXT": "text",
    "NUMERIC": "number",
    "DATE": "date",
    "TIME": "time",
    "YES_NO": "boolean",
    "SINGLE_CHOICE": "single-choice",
    "MULTIPLE_CHOICE": "multiple-choice",
    "SCALE_1_5": "rating-1-5",
    "PHOTO": "photo",
    "MULTIPLE_PHOTOS": "multiple-photos",
    "LOCATION": "location",
    "AUDIO": "audio",
};

export const toBackendType = (type: FrontendQuestionType): BackendQuestionType => {
    return TYPE_TO_BACKEND[type];
}

export function fromBackendType(type: BackendQuestionType): FrontendQuestionType {
    return TYPE_FROM_BACKEND[type] ?? "text";
}

interface BackendSection {
    id: number;
    title: string;
    order: number;
    researchId: number;
}

export const getSections = async (researchId: number): Promise<BackendSection[]> => {
    const response = await fetch(`http://localhost:3001/section?researchId=${researchId}`, {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to get sections');

    return response.json();
}

export const createSection = async (title: string, order: number, researchId: number): Promise<BackendSection> => {
    const response = await fetch(`http://localhost:3001/section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, order, researchId }),
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Failed to create section');
    }

    return response.json()
}

interface BackendQuestion {
    id: number;
    statement: string;
    type: BackendQuestionType;
    helpText: string | null;
    isRequired: boolean;
    order: number;
    sectionId: number;
}

export const getQuestions = async (sectionId: number): Promise<BackendQuestion[]> => {
    const response = await fetch(`http://localhost:3001/question?sectionId=${sectionId}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to get questions');

    return response.json()
}

export const createQuestion = async (payload: {
    statement: string;
    type: BackendQuestionType;
    helpText?: string;
    isRequired: boolean;
    order: number;
    sectionId: number;
}): Promise<BackendQuestion> => {
    const response = await fetch(`http://localhost:3001/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Failed to create question');
    }

    return response.json();
}

export const loadQuestionnaire = async (researchId: number): Promise<Question[]> => {
    const sections = await getSections(researchId);

    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    const allQuestions: Question[] = [];
    let globalOrder = 1;

    for (const section of sortedSections) {
        const questions = await getQuestions(section.id);
        const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

        for (const q of sortedQuestions) {
            allQuestions.push({
                id: String(q.id),
                title: q.statement,
                type: fromBackendType(q.type),
                helpText: q.helpText ?? "",
                required: q.isRequired,
                order: globalOrder++,
                section: section.title,
                options: [{ id: crypto.randomUUID(), text: "Opção 1" }],
            })
        }
    }

    return allQuestions;
}

export const saveQuestionnaire = async (researchId: number, questions: Question[]): Promise<void> => {
    // agrupa mantendo a ordem de primeira aparição de cada seção
    const sectionNames: string[] = [];
    const questionsBySection = new Map<string, Question[]>();

    for (const q of questions) {
        const sectionName = q.section || "Geral";
        if (!questionsBySection.has(sectionName)) {
            sectionNames.push(sectionName);
            questionsBySection.set(sectionName, []);
        }
        questionsBySection.get(sectionName)!.push(q);
    }

    for (let sectionOrder = 0; sectionOrder < sectionNames.length; sectionOrder++) {
        const sectionName = sectionNames[sectionOrder];
        const section = await createSection(sectionName, sectionOrder + 1, researchId);

        const sectionQuestions = questionsBySection.get(sectionName)!;

        for (let questionOrder = 0; questionOrder < sectionQuestions.length; questionOrder++) {
            const q = sectionQuestions[questionOrder];

            await createQuestion({
                statement: q.title,
                type: toBackendType(q.type),
                helpText: q.helpText || undefined,
                isRequired: q.required,
                order: questionOrder + 1,
                sectionId: section.id,
            });
        }
    }
};

const sectionCache = new Map<string, BackendSection>();


export const getOrCreateSections = async (title: string, order: number, researchId: number): Promise<BackendSection> => {
    const cacheKey = `${researchId}-${title}`;

    if (sectionCache.has(cacheKey)) {
        return sectionCache.get(cacheKey)!;
    }

    const section = await createSection(title, order, researchId);
    sectionCache.set(cacheKey, section);

    return section
}

export const clearSectionCache = () => sectionCache.clear();
