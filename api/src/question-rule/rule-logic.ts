// Lógica pura (sem banco) das regras de exibição.
//
// Uma regra diz: "a questão afetada (target) só aparece quando a questão de
// origem (source) recebe a resposta triggerValue". A origem sempre precisa vir
// ANTES da questão afetada na ordem do questionário (seção, depois questão).

export const RULE_SOURCE_TYPES = ['YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE_1_5'] as const;

export interface StructQuestion {
  id: number;
  sectionId: number;
  sectionOrder: number;
  order: number;
  statement: string;
  type: string;
  options: { id: number; text: string }[];
}

export interface RuleEdge {
  id: number;
  sourceQuestionId: number;
  targetQuestionId: number;
  triggerValue: string;
}

export interface NewRuleInput {
  sourceQuestionId: number;
  targetQuestionId: number;
  triggerValue: string;
}

const isChoice = (type: string) => type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE';

export function canBeRuleSource(type: string): boolean {
  return (RULE_SOURCE_TYPES as readonly string[]).includes(type);
}

/** Posição de cada questão na ordem do questionário (0 = primeira). */
export function buildRanking(questions: StructQuestion[]): Map<number, number> {
  const sorted = [...questions].sort(
    (a, b) =>
      a.sectionOrder - b.sectionOrder ||
      a.sectionId - b.sectionId ||
      a.order - b.order ||
      a.id - b.id,
  );
  return new Map(sorted.map((q, index) => [q.id, index]));
}

export function questionLabel(q: StructQuestion): string {
  return `Seção ${q.sectionOrder} · Q${q.order}`;
}

export function triggerLabel(q: StructQuestion | undefined, triggerValue: string): string {
  if (!q) return triggerValue;
  if (q.type === 'YES_NO') return triggerValue === 'YES' ? 'Sim' : triggerValue === 'NO' ? 'Não' : triggerValue;
  if (isChoice(q.type)) return q.options.find((o) => String(o.id) === triggerValue)?.text ?? triggerValue;
  return triggerValue;
}

/** Retorna a mensagem de erro, ou null se a resposta é válida para a questão. */
export function validateTrigger(q: StructQuestion, triggerValue: string): string | null {
  if (!canBeRuleSource(q.type)) {
    return `A questão de origem (${questionLabel(q)}) não pode disparar regras. Só questões de Sim/Não, Escolha Única, Múltipla Escolha ou Escala de 1 a 5 podem.`;
  }
  const invalid = `A resposta escolhida não é válida para a questão de origem (${questionLabel(q)}).`;
  if (q.type === 'YES_NO') return triggerValue === 'YES' || triggerValue === 'NO' ? null : invalid;
  if (q.type === 'SCALE_1_5') return ['1', '2', '3', '4', '5'].includes(triggerValue) ? null : invalid;
  return q.options.some((o) => String(o.id) === triggerValue) ? null : invalid;
}

/** Caminho from -> ... -> to seguindo as regras (origem -> afetada), ou null. */
export function findPath(edges: RuleEdge[], from: number, to: number): number[] | null {
  const next = new Map<number, number[]>();
  for (const e of edges) {
    next.set(e.sourceQuestionId, [...(next.get(e.sourceQuestionId) ?? []), e.targetQuestionId]);
  }
  const previous = new Map<number, number>();
  const visited = new Set<number>([from]);
  const queue = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) {
      const path = [to];
      while (path[0] !== from) path.unshift(previous.get(path[0])!);
      return path;
    }
    for (const n of next.get(current) ?? []) {
      if (visited.has(n)) continue;
      visited.add(n);
      previous.set(n, current);
      queue.push(n);
    }
  }
  return null;
}

/**
 * Valida uma regra nova. Retorna a mensagem de recusa, ou null se pode salvar.
 * Ordem das checagens: ela mesma, tipo/resposta, duplicada, ciclo, ordem.
 */
export function checkNewRule(
  questions: StructQuestion[],
  edges: RuleEdge[],
  input: NewRuleInput,
): string | null {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const source = byId.get(input.sourceQuestionId);
  const target = byId.get(input.targetQuestionId);
  if (!source || !target) return 'As duas questões da regra precisam pertencer à mesma pesquisa.';

  if (source.id === target.id) return 'Uma questão não pode depender dela mesma.';

  const triggerError = validateTrigger(source, input.triggerValue);
  if (triggerError) return triggerError;

  const duplicated = edges.some(
    (e) =>
      e.sourceQuestionId === source.id &&
      e.targetQuestionId === target.id &&
      e.triggerValue === input.triggerValue,
  );
  if (duplicated) return 'Essa regra já está cadastrada.';

  // Ciclo: a regra nova source -> target fecha um ciclo se já existe target -> ... -> source.
  const back = findPath(edges, target.id, source.id);
  if (back) {
    const labels = [source.id, ...back].map((id) => questionLabel(byId.get(id)!));
    return `A regra cria um ciclo de dependência (${labels.join(' → ')}). Uma questão não pode depender, direta ou indiretamente, dela mesma.`;
  }

  const rank = buildRanking(questions);
  if (rank.get(source.id)! >= rank.get(target.id)!) {
    return `A questão afetada (${questionLabel(target)}) vem antes da questão de origem (${questionLabel(source)}). Uma regra só pode afetar questões que vêm depois da questão de origem.`;
  }

  return null;
}

/** Regras cuja origem não vem mais antes da questão afetada. */
export function findOutOfOrderRules(questions: StructQuestion[], edges: RuleEdge[]): RuleEdge[] {
  const rank = buildRanking(questions);
  return edges.filter((e) => {
    const s = rank.get(e.sourceQuestionId);
    const t = rank.get(e.targetQuestionId);
    return s === undefined || t === undefined || s >= t;
  });
}

/** Regras da questão (como origem) cuja resposta deixou de ser válida para ela. */
export function findRulesWithInvalidTrigger(question: StructQuestion, edges: RuleEdge[]): RuleEdge[] {
  return edges.filter(
    (e) => e.sourceQuestionId === question.id && validateTrigger(question, e.triggerValue) !== null,
  );
}
