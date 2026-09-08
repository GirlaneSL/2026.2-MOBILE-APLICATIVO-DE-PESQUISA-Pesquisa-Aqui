import { apiFetch } from "./apiFetcher";

export type FrontendQuestionType =
    | "text" | "number" | "date" | "time" | "boolean"
    | "single-choice" | "multiple-choice" | "rating-1-5"
    | "photo" | "multiple-photos" | "location" | "audio";

export type BackendQuestionType =
    | "FREE_TEXT" | "NUMERIC" | "DATE" | "TIME" | "YES_NO"
    | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SCALE_1_5"
    | "PHOTO" | "MULTIPLE_PHOTOS" | "LOCATION" | "AUDIO";

const TYPE_TO_BACKEND: Record<FrontendQuestionType, BackendQuestionType> = {
    "text": "FREE_TEXT", "number": "NUMERIC", "date": "DATE", "time": "TIME",
    "boolean": "YES_NO", "single-choice": "SINGLE_CHOICE", "multiple-choice": "MULTIPLE_CHOICE",
    "rating-1-5": "SCALE_1_5", "photo": "PHOTO", "multiple-photos": "MULTIPLE_PHOTOS",
    "location": "LOCATION", "audio": "AUDIO",
};

const TYPE_FROM_BACKEND: Record<BackendQuestionType, FrontendQuestionType> = {
    "FREE_TEXT": "text", "NUMERIC": "number", "DATE": "date", "TIME": "time",
    "YES_NO": "boolean", "SINGLE_CHOICE": "single-choice", "MULTIPLE_CHOICE": "multiple-choice",
    "SCALE_1_5": "rating-1-5", "PHOTO": "photo", "MULTIPLE_PHOTOS": "multiple-photos",
    "LOCATION": "location", "AUDIO": "audio",
};

export const toBackendType = (type: FrontendQuestionType): BackendQuestionType => TYPE_TO_BACKEND[type];
export function fromBackendType(type: BackendQuestionType): FrontendQuestionType { return TYPE_FROM_BACKEND[type] ?? "text"; }

export interface Option { id: string; text: string; }

export interface FormQuestion {
    id: string;
    title: string;
    type: FrontendQuestionType;
    helpText: string;
    required: boolean;
    order: number;
    options: Option[];
}

export interface FormSection {
    id: string;
    title: string;
    order: number;
    questions: FormQuestion[];
}

export const getSections = async (researchId: number) => {
    const response = await apiFetch(`/section?researchId=${researchId}`, { method: 'GET', credentials: 'include' });
    if (!response.ok) throw new Error('Failed to get sections');
    return response.json();
}

export const createSection = async (title: string, order: number, researchId: number) => {
    const response = await apiFetch(`/section`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ title, order, researchId }),
    });
    if (!response.ok) throw new Error('Failed to create section');
    return response.json();
}

export const updateSectionApi = async (id: number, payload: { title?: string; order?: number }) => {
    const response = await apiFetch(`/section/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update section');
    return response.json();
}

export const deleteSectionApi = async (id: number) => {
    const response = await apiFetch(`/section/${id}`, {
        method: 'DELETE', credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete section');
    return response.json();
}

export const getQuestions = async (sectionId: number) => {
    const response = await apiFetch(`/question?sectionId=${sectionId}`, { method: 'GET', credentials: 'include' });
    if (!response.ok) throw new Error('Failed to get questions');
    return response.json();
}

export const createQuestion = async (payload: any) => {
    const response = await apiFetch(`/question`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to create question');
    return response.json();
}

export const updateQuestionApi = async (id: number, payload: any) => {
    const response = await apiFetch(`/question/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update question');
    return response.json();
}

export const deleteQuestionApi = async (id: number) => {
    const response = await apiFetch(`/question/${id}`, {
        method: 'DELETE', credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete question');
    return response.json();
}

export const loadQuestionnaire = async (researchId: number): Promise<FormSection[]> => {
    const sections = await getSections(researchId);
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    const result: FormSection[] = [];

    for (const section of sortedSections) {
        const questions = await getQuestions(section.id);
        const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

        result.push({
            id: String(section.id),
            title: section.title,
            order: section.order,
            questions: sortedQuestions.map(q => ({
                id: String(q.id),
                title: q.statement,
                type: fromBackendType(q.type),
                helpText: q.helpText ?? "",
                required: q.isRequired,
                order: q.order,
                options: [{ id: crypto.randomUUID(), text: "Opção 1" }]
            }))
        });
    }
    return result;
}

export const saveQuestionnaire = async (researchId: number, sections: FormSection[]): Promise<void> => {
    for (let sIndex = 0; sIndex < sections.length; sIndex++) {
        const sec = sections[sIndex];
        const createdSection = await createSection(sec.title || `Seção ${sIndex + 1}`, sIndex + 1, researchId);

        for (let qIndex = 0; qIndex < sec.questions.length; qIndex++) {
            const q = sec.questions[qIndex];
            await createQuestion({
                statement: q.title || "Nova Pergunta",
                type: toBackendType(q.type),
                helpText: q.helpText || undefined,
                isRequired: q.required,
                order: qIndex + 1,
                sectionId: createdSection.id,
            });
        }
    }
};