import {
  checkNewRule,
  findOutOfOrderRules,
  findPath,
  findRulesWithInvalidTrigger,
  type RuleEdge,
  type StructQuestion,
} from './rule-logic';

const q = (
  id: number,
  sectionOrder: number,
  order: number,
  type = 'YES_NO',
  options: { id: number; text: string }[] = [],
): StructQuestion => ({
  id,
  sectionId: sectionOrder * 10,
  sectionOrder,
  order,
  statement: `Questão ${id}`,
  type,
  options,
});

// Seção 1: Q1 (sim/não), Q2 (ocupação), Q3 | Seção 2: Q4, Q5
const questions: StructQuestion[] = [
  q(1, 1, 1),
  q(2, 1, 2, 'SINGLE_CHOICE', [{ id: 21, text: 'Assalariado' }, { id: 22, text: 'Autônomo' }]),
  q(3, 1, 3, 'FREE_TEXT'),
  q(4, 2, 1),
  q(5, 2, 2, 'FREE_TEXT'),
];

const edge = (id: number, source: number, target: number, trigger: string): RuleEdge => ({
  id,
  sourceQuestionId: source,
  targetQuestionId: target,
  triggerValue: trigger,
});

describe('checkNewRule', () => {
  it('aceita regra para uma questão posterior, na mesma seção ou em outra', () => {
    expect(checkNewRule(questions, [], { sourceQuestionId: 1, targetQuestionId: 3, triggerValue: 'YES' })).toBeNull();
    expect(checkNewRule(questions, [], { sourceQuestionId: 2, targetQuestionId: 5, triggerValue: '21' })).toBeNull();
  });

  it('recusa regra que aponta para uma questão anterior na ordem', () => {
    const msg = checkNewRule(questions, [], { sourceQuestionId: 4, targetQuestionId: 1, triggerValue: 'YES' });
    expect(msg).toContain('vem antes da questão de origem');
  });

  it('recusa quando a seção da afetada vem antes, mesmo com número de questão maior', () => {
    const msg = checkNewRule(questions, [], { sourceQuestionId: 5, targetQuestionId: 3, triggerValue: 'YES' });
    expect(msg).not.toBeNull();
  });

  it('recusa a questão dependendo dela mesma', () => {
    expect(checkNewRule(questions, [], { sourceQuestionId: 1, targetQuestionId: 1, triggerValue: 'YES' })).toContain(
      'dela mesma',
    );
  });

  it('detecta ciclo e mostra o caminho na mensagem', () => {
    // 1 -> 2 -> 3 já existe; 3 -> 1 fecharia o ciclo.
    const edges = [edge(1, 1, 2, 'YES'), edge(2, 2, 3, '21')];
    const msg = checkNewRule(
      [...questions.slice(0, 2), q(3, 1, 3, 'YES_NO'), ...questions.slice(3)],
      edges,
      { sourceQuestionId: 3, targetQuestionId: 1, triggerValue: 'YES' },
    );
    expect(msg).toContain('ciclo');
    expect(msg).toContain('Seção 1 · Q3 → Seção 1 · Q1');
  });

  it('recusa resposta inválida para o tipo da questão de origem', () => {
    expect(checkNewRule(questions, [], { sourceQuestionId: 1, targetQuestionId: 3, triggerValue: 'MAYBE' })).toContain(
      'não é válida',
    );
    expect(checkNewRule(questions, [], { sourceQuestionId: 2, targetQuestionId: 5, triggerValue: '999' })).toContain(
      'não é válida',
    );
  });

  it('recusa origem de tipo que não dispara regra', () => {
    expect(checkNewRule(questions, [], { sourceQuestionId: 3, targetQuestionId: 5, triggerValue: 'x' })).toContain(
      'não pode disparar regras',
    );
  });

  it('recusa regra duplicada', () => {
    const edges = [edge(1, 1, 3, 'YES')];
    expect(checkNewRule(questions, edges, { sourceQuestionId: 1, targetQuestionId: 3, triggerValue: 'YES' })).toContain(
      'já está cadastrada',
    );
  });
});

describe('findPath', () => {
  it('acha caminhos indiretos e retorna null quando não há', () => {
    const edges = [edge(1, 1, 2, 'YES'), edge(2, 2, 3, '21')];
    expect(findPath(edges, 1, 3)).toEqual([1, 2, 3]);
    expect(findPath(edges, 3, 1)).toBeNull();
  });
});

describe('reordenação', () => {
  const edges = [edge(1, 1, 3, 'YES'), edge(2, 2, 5, '21')];

  it('não aponta ninguém quando a ordem continua válida', () => {
    expect(findOutOfOrderRules(questions, edges)).toEqual([]);
  });

  it('aponta a regra que passa a apontar para trás ao mover a questão de origem', () => {
    // Q1 passa a ser a última questão da seção 1: agora vem depois da Q3.
    const moved = questions.map((x) => (x.id === 1 ? { ...x, order: 9 } : x));
    expect(findOutOfOrderRules(moved, edges).map((e) => e.id)).toEqual([1]);
  });

  it('aponta a regra ao mover a seção da afetada para antes da origem', () => {
    const moved = questions.map((x) => (x.sectionOrder === 2 ? { ...x, sectionOrder: 0 } : x));
    expect(findOutOfOrderRules(moved, edges).map((e) => e.id)).toEqual([2]);
  });
});

describe('troca de tipo da questão de origem', () => {
  it('invalida regras cuja resposta deixou de existir no novo tipo', () => {
    const edges = [edge(1, 2, 5, '21')];
    const asYesNo = { ...questions[1], type: 'YES_NO' };
    expect(findRulesWithInvalidTrigger(asYesNo, edges).map((e) => e.id)).toEqual([1]);

    const asMultiple = { ...questions[1], type: 'MULTIPLE_CHOICE' };
    expect(findRulesWithInvalidTrigger(asMultiple, edges)).toEqual([]);
  });
});
