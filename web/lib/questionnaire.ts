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

export interface Option { id: string; text: string; order: number; }

export interface FormQuestion {
    id: string;
    title: string;
    type: FrontendQuestionType;
    helpText: string;
    required: boolean;
    order: number;
    options: Option[];
    minSelections?: number;
    maxSelections?: number;
    minValue?: number;
    maxValue?: number;
    minDate?: string;
    maxDate?: string;
    maxLength?: number;
    scaleLeftLabel?: string;
    scaleRightLabel?: string;
    maxFiles?: number;
    maxDuration?: number;
}

export interface FormSection {
    id: string;
    title: string;
    order: number;
    questions: FormQuestion[];
}

// === SEÇÕES ===
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
    const response = await apiFetch(`/section/${id}`, { method: 'DELETE' });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Failed to delete section');
    }
    return response.json();
}

// === QUESTÕES ===
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
    const response = await apiFetch(`/question/${id}`, { method: 'DELETE' });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || 'Failed to delete question');
    }
    return response.json();
}

// === OPÇÕES ===
export const createOptionApi = async (questionId: number, text: string, order: number) => {
    const response = await apiFetch(`/question/${questionId}/option`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ text, order })
    });
    if (!response.ok) throw new Error('Failed to create option');
    return response.json();
}
export const updateOptionApi = async (id: number, payload: { text?: string; order?: number }) => {
    const response = await apiFetch(`/question/option/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update option');
    return response.json();
}
export const deleteOptionApi = async (id: number) => {
    const response = await apiFetch(`/question/option/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) throw new Error('Failed to delete option');
    return response.json();
}
export const getOptionsApi = async (questionId: number) => {
    const response = await apiFetch(`/question/${questionId}/options`, { method: 'GET', credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
}

export const loadQuestionnaire = async (researchId: number): Promise<FormSection[]> => {
    const sections = await getSections(researchId);
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    const result: FormSection[] = [];

    for (const section of sortedSections) {
        const questions = await getQuestions(section.id);
        const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

        const mappedQuestions = [];
        for (const q of sortedQuestions) {
            const optionsRaw = await getOptionsApi(q.id);
            const sortedOptions = [...optionsRaw].sort((a: any, b: any) => a.order - b.order);
            const options: Option[] = sortedOptions.map((o: any) => ({ id: String(o.id), text: o.text, order: o.order }));

            mappedQuestions.push({
                id: String(q.id),
                title: q.statement,
                type: fromBackendType(q.type),
                helpText: q.helpText ?? "",
                required: q.isRequired,
                order: q.order,
                minSelections: q.minSelections ?? undefined,
                maxSelections: q.maxSelections ?? undefined,
                minValue: q.minValue ?? undefined,
                maxValue: q.maxValue ?? undefined,
                minDate: q.minDate ?? undefined,
                maxDate: q.maxDate ?? undefined,
                maxLength: q.maxLength ?? undefined,
                scaleLeftLabel: q.scaleLeftLabel ?? undefined,
                scaleRightLabel: q.scaleRightLabel ?? undefined,
                maxFiles: q.maxFiles ?? undefined,
                maxDuration: q.maxDuration ?? undefined,
                options: options
            });
        }

        result.push({
            id: String(section.id),
            title: section.title,
            order: section.order,
            questions: mappedQuestions
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
            const newQ = await createQuestion({
                statement: q.title || "Nova Pergunta",
                type: toBackendType(q.type),
                helpText: q.helpText || undefined,
                isRequired: q.required,
                order: qIndex + 1,
                sectionId: createdSection.id,
                minSelections: q.type === "multiple-choice" ? q.minSelections : undefined,
                maxSelections: q.type === "multiple-choice" ? q.maxSelections : undefined,
                minValue: q.type === "number" ? q.minValue : undefined,
                maxValue: q.type === "number" ? q.maxValue : undefined,
                minDate: q.type === "date" ? q.minDate : undefined,
                maxDate: q.type === "date" ? q.maxDate : undefined,
                maxLength: q.type === "text" ? q.maxLength : undefined,
                scaleLeftLabel: q.type === "rating-1-5" ? q.scaleLeftLabel : undefined,
                scaleRightLabel: q.type === "rating-1-5" ? q.scaleRightLabel : undefined,
                maxFiles: q.type === "multiple-photos" ? q.maxFiles : undefined,
                maxDuration: q.type === "audio" ? q.maxDuration : undefined,
            });

            if (q.options && q.options.length > 0) {
                for (let oIndex = 0; oIndex < q.options.length; oIndex++) {
                    await createOptionApi(newQ.id, q.options[oIndex].text, oIndex + 1);
                }
            }
        }
    }
};