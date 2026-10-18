// Regras de exibição no app: decide quais questões o entrevistado vê e o que
// ainda falta responder. As regras vêm no pacote da pesquisa (`displayRules`),
// cadastradas na web: "a questão afetada só aparece quando a questão de origem
// recebe a resposta triggerValue".
//
// Formato do gatilho (triggerValue), igual ao da API:
//   YES_NO                          -> "YES" | "NO"
//   SINGLE_CHOICE / MULTIPLE_CHOICE -> id da opção (como texto)
//   SCALE_1_5                       -> "1" a "5"

export interface PackageOption {
    id: number;
    text: string;
    order: number;
}

// Limites cadastrados na web e entregues no pacote. Todos opcionais: sem limite, sem validação.
// minDate/maxDate chegam como "AAAA-MM-DD".
export interface QuestionValidations {
    isRequired?: boolean;
    // Múltipla escolha: quantas opções o entrevistado pode marcar
    minSelections?: number | null;
    maxSelections?: number | null;
    maxLength?: number | null;
    minValue?: number | null;
    maxValue?: number | null;
    minDate?: string | null;
    maxDate?: string | null;
}

export interface PackageQuestion {
    id: number;
    statement: string;
    type: string;
    isRequired: boolean;
    order: number;
    options: PackageOption[];
    // O pacote manda os limites no objeto `validations` e também nos campos planos (compatibilidade).
    validations?: QuestionValidations;
    minSelections?: number | null;
    maxSelections?: number | null;
    // Escala 1 a 5: rótulos das pontas (1 e 5), cadastrados na web
    scaleLeftLabel?: string | null;
    scaleRightLabel?: string | null;
    maxLength?: number | null;
    minValue?: number | null;
    maxValue?: number | null;
    minDate?: string | null;
    maxDate?: string | null;
    // Várias fotos: quantas fotos a questão aceita. O pacote manda em `recording.maxFiles`
    // (e também no campo plano, por compatibilidade).
    maxFiles?: number | null;
    recording?: { maxFiles?: number | null; maxDuration?: number | null };
}

export interface PackageSection {
    id: number;
    title: string;
    order: number;
    questions: PackageQuestion[];
}

export interface DisplayRule {
    id: number;
    sourceQuestionId: number;
    triggerValue: string;
    targetQuestionId: number;
}

export interface ResearchPackage {
    id: number;
    title: string;
    // Pesquisa com gravação: o app exige o consentimento e grava a entrevista inteira
    recordInterview?: boolean;
    sections: PackageSection[];
    displayRules: DisplayRule[];
}

// Resposta como o app a guarda: boolean (Sim/Não), id da opção (ou lista de ids), nota da escala...
export type AnswerValue = string | number | boolean | Array<string | number> | null | undefined;
export type Answers = Record<number, AnswerValue>;

/** Respostas como lista de textos comparáveis com triggerValue. */
function toComparableList(answer: AnswerValue): string[] {
    if (answer === null || answer === undefined) return [];
    const items = Array.isArray(answer) ? answer : [answer];
    return items.map((item) => {
        if (item === true) return 'YES';
        if (item === false) return 'NO';
        const text = String(item).trim();
        if (/^(true|yes)$/i.test(text)) return 'YES';
        if (/^(false|no)$/i.test(text)) return 'NO';
        return text;
    });
}

export function isAnswerEmpty(answer: AnswerValue): boolean {
    if (answer === null || answer === undefined) return true;
    if (typeof answer === 'string') return answer.trim() === '';
    if (Array.isArray(answer)) return answer.length === 0;
    return false; // número e boolean (inclusive 0 e false) contam como resposta
}

/** Questões na ordem do questionário (seção, depois questão). */
export function orderedQuestions(pkg: Pick<ResearchPackage, 'sections'>): PackageQuestion[] {
    return [...pkg.sections]
        .sort((a, b) => a.order - b.order)
        .flatMap((section) => [...section.questions].sort((a, b) => a.order - b.order));
}

/**
 * Ids das questões que o entrevistado vê com as respostas atuais.
 * - Sem regra apontando para ela, a questão sempre aparece.
 * - Com regras, basta UMA ser verdadeira (origem visível e respondida com o gatilho).
 * - Origem escondida não dispara nada: o pulo se propaga em cadeia.
 */
export function getVisibleQuestionIds(
    pkg: Pick<ResearchPackage, 'sections'> & { displayRules?: DisplayRule[] },
    answers: Answers,
): Set<number> {
    return getVisibleQuestionIdsInOrder(orderedQuestions(pkg), pkg.displayRules ?? [], answers);
}

/**
 * Mesma regra de getVisibleQuestionIds para uma lista de questões que já está na ordem do
 * questionário (seção, depois questão). Usada no envio, que recebe só a lista de questões.
 */
export function getVisibleQuestionIdsInOrder(
    questions: PackageQuestion[],
    rules: DisplayRule[],
    answers: Answers,
): Set<number> {
    const visible = new Set<number>();

    for (const question of questions) {
        const rulesForQuestion = rules.filter((rule) => rule.targetQuestionId === question.id);
        const shown =
            rulesForQuestion.length === 0 ||
            rulesForQuestion.some(
                (rule) =>
                    visible.has(rule.sourceQuestionId) &&
                    toComparableList(answers[rule.sourceQuestionId]).includes(rule.triggerValue),
            );
        if (shown) visible.add(question.id);
    }
    return visible;
}

/**
 * Obrigatórias que ainda faltam. Questão escondida por regra NÃO conta como
 * obrigatória, senão o pesquisador ficaria preso pedindo uma resposta que não aparece.
 */
export function getMissingRequiredQuestionIds(
    pkg: Pick<ResearchPackage, 'sections'> & { displayRules?: DisplayRule[] },
    answers: Answers,
): number[] {
    const visible = getVisibleQuestionIds(pkg, answers);
    return orderedQuestions(pkg)
        .filter((q) => visible.has(q.id) && q.isRequired && isAnswerEmpty(answers[q.id]))
        .map((q) => q.id);
}

/** Descarta respostas de questões que ficaram escondidas (ex.: o entrevistado voltou e mudou a origem). */
export function pruneHiddenAnswers(
    pkg: Pick<ResearchPackage, 'sections'> & { displayRules?: DisplayRule[] },
    answers: Answers,
): Answers {
    const visible = getVisibleQuestionIds(pkg, answers);
    const kept: Answers = {};
    for (const [id, value] of Object.entries(answers)) {
        if (visible.has(Number(id))) kept[Number(id)] = value;
    }
    return kept;
}
