import { isAnswerEmpty, type AnswerValue, type PackageQuestion } from './displayRules';

// Cada questão chega no pacote com o seu `type` e os seus limites (cadastrados na web).
// Aqui ficam só os comportamentos por tipo: o app olha o tipo da questão, procura o
// comportamento correspondente e, se não conhece o tipo, trata como "não suportado"
// (a tela mostra um aviso e deixa avançar) em vez de quebrar.

// ---------- Limites vindos do servidor ----------

export interface QuestionLimits {
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    minDate?: string; // AAAA-MM-DD
    maxDate?: string; // AAAA-MM-DD
}

function toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function toIsoDate(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}

/** Limites da questão: lê o objeto `validations` do pacote e cai nos campos planos se faltar. */
export function getQuestionLimits(question: PackageQuestion): QuestionLimits {
    const v = question.validations;
    const maxLength = toNumber(v?.maxLength ?? question.maxLength);
    return {
        maxLength: maxLength !== undefined && maxLength > 0 ? maxLength : undefined,
        minValue: toNumber(v?.minValue ?? question.minValue),
        maxValue: toNumber(v?.maxValue ?? question.maxValue),
        minDate: toIsoDate(v?.minDate ?? question.minDate),
        maxDate: toIsoDate(v?.maxDate ?? question.maxDate),
    };
}

// ---------- Datas e horas ----------

export interface DateParts {
    day: number;
    month: number; // 1-12
    year: number;
}

export function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

/** Número comparável: 2026-10-11 -> 20261011. */
export function dateKey(d: DateParts): number {
    return d.year * 10000 + d.month * 100 + d.day;
}

function isRealDate(d: DateParts): boolean {
    return d.month >= 1 && d.month <= 12 && d.day >= 1 && d.day <= daysInMonth(d.year, d.month);
}

/** "DD/MM/AAAA" (como o app guarda a resposta) -> partes, ou null se não for uma data real. */
export function parseBrDate(text: string): DateParts | null {
    const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const parts = { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
    return isRealDate(parts) ? parts : null;
}

/** "AAAA-MM-DD" (como o servidor manda o intervalo) -> partes. */
export function parseIsoDate(text: string | undefined): DateParts | null {
    if (!text) return null;
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const parts = { day: Number(m[3]), month: Number(m[2]), year: Number(m[1]) };
    return isRealDate(parts) ? parts : null;
}

export function formatBrDate(d: DateParts): string {
    return `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${d.year}`;
}

export function parseTime(text: string): { hour: number; minute: number } | null {
    const m = text.match(/^(\d{2}):(\d{2})$/);
    if (!m) return null;
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export function formatTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// ---------- Numérica ----------

/** Aceita "12", "-3", "3,5" e "3.5". Qualquer outra coisa não é número. */
export function parseNumeric(text: string): number | null {
    const normalized = text.trim().replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

const formatNumber = (n: number) => String(n).replace('.', ',');

// ---------- Comportamento por tipo ----------

type Validator = (question: PackageQuestion, value: AnswerValue) => string | null;

function validateText(question: PackageQuestion, value: AnswerValue): string | null {
    const { maxLength } = getQuestionLimits(question);
    if (typeof value !== 'string' || maxLength === undefined) return null;
    return value.length > maxLength
        ? `Use no máximo ${maxLength} caracteres (a resposta tem ${value.length}).`
        : null;
}

function validateNumeric(question: PackageQuestion, value: AnswerValue): string | null {
    const { minValue, maxValue } = getQuestionLimits(question);
    const n = typeof value === 'number' ? value : parseNumeric(String(value));

    if (n === null) return 'Informe apenas números (por exemplo 12 ou 3,5).';

    if (minValue !== undefined && maxValue !== undefined && (n < minValue || n > maxValue)) {
        return `Informe um número entre ${formatNumber(minValue)} e ${formatNumber(maxValue)}.`;
    }
    if (minValue !== undefined && n < minValue) return `Informe um número maior ou igual a ${formatNumber(minValue)}.`;
    if (maxValue !== undefined && n > maxValue) return `Informe um número menor ou igual a ${formatNumber(maxValue)}.`;
    return null;
}

/** Texto do intervalo de datas permitido, ou null se não há intervalo. */
export function describeDateRange(question: PackageQuestion): string | null {
    const min = parseIsoDate(getQuestionLimits(question).minDate);
    const max = parseIsoDate(getQuestionLimits(question).maxDate);
    if (min && max) return `entre ${formatBrDate(min)} e ${formatBrDate(max)}`;
    if (min) return `a partir de ${formatBrDate(min)}`;
    if (max) return `até ${formatBrDate(max)}`;
    return null;
}

function validateDate(question: PackageQuestion, value: AnswerValue): string | null {
    const date = typeof value === 'string' ? parseBrDate(value) : null;
    if (!date) return 'Informe uma data válida no formato DD/MM/AAAA.';

    const limits = getQuestionLimits(question);
    const min = parseIsoDate(limits.minDate);
    const max = parseIsoDate(limits.maxDate);
    const outOfRange = (min && dateKey(date) < dateKey(min)) || (max && dateKey(date) > dateKey(max));
    return outOfRange ? `Informe uma data ${describeDateRange(question)}.` : null;
}

function validateTime(_question: PackageQuestion, value: AnswerValue): string | null {
    return typeof value === 'string' && parseTime(value) ? null : 'Informe um horário válido no formato HH:MM.';
}

// Tipos que a tela de coleta sabe preencher. Foto, várias fotos e áudio dependem de câmera/gravador
// por questão e ficam para uma próxima história. Uma entrada sem validador = tipo sem regra de formato.
const QUESTION_TYPE_VALIDATORS = {
    FREE_TEXT: validateText,
    NUMERIC: validateNumeric,
    DATE: validateDate,
    TIME: validateTime,
    YES_NO: undefined,
    SINGLE_CHOICE: undefined,
    MULTIPLE_CHOICE: undefined,
    SCALE_1_5: undefined,
    LOCATION: undefined,
} satisfies Record<string, Validator | undefined>;

export type SupportedQuestionType = keyof typeof QUESTION_TYPE_VALIDATORS;

/** O app sabe desenhar e validar este tipo? (Tipo novo no servidor = false, nunca um erro.) */
export function isQuestionTypeSupported(type: string): type is SupportedQuestionType {
    return Object.prototype.hasOwnProperty.call(QUESTION_TYPE_VALIDATORS, type);
}

/**
 * Mensagem do que era esperado quando a resposta fere o formato ou os limites da questão,
 * ou null se está tudo certo. Resposta vazia não é erro de formato (obrigatoriedade é outra regra).
 */
export function validateAnswer(question: PackageQuestion, value: AnswerValue): string | null {
    if (isAnswerEmpty(value) || !isQuestionTypeSupported(question.type)) return null;
    const validator: Validator | undefined = QUESTION_TYPE_VALIDATORS[question.type];
    return validator ? validator(question, value) : null;
}
