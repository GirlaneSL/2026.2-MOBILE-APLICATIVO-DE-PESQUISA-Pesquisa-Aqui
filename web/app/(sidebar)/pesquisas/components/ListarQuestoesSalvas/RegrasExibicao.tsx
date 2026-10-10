import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CornerDownRight, EyeOff, GitBranch, Plus, X } from "lucide-react";
import type { DisplayRule, FormQuestion, FormSection } from "@/lib/questionnaire";

// Contexto das regras repassado de ListarQuestoesSalvas até cada questão.
export interface RulesContext {
    sections: FormSection[];
    rules: DisplayRule[];
    onAddRule: (targetQuestionId: string, sourceQuestionId: string, triggerValue: string) => Promise<boolean>;
    onDeleteRule: (ruleId: number) => Promise<void>;
}

// Tipos cuja resposta pode disparar uma regra (mesma lista da API).
const RULE_SOURCE_TYPES = ["boolean", "single-choice", "multiple-choice", "rating-1-5"];

const shorten = (text: string, max = 50) => (text.length > max ? `${text.slice(0, max)}…` : text);

function triggerOptionsFor(q: FormQuestion): { value: string; label: string }[] {
    if (q.type === "boolean") return [{ value: "YES", label: "Sim" }, { value: "NO", label: "Não" }];
    if (q.type === "rating-1-5") return ["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: n }));
    return (q.options ?? []).map((o) => ({ value: o.id, label: o.text || "(opção sem texto)" }));
}

// Rótulos vêm do estado local para acompanhar a ordem/títulos enquanto o admin edita.
function findQuestion(sections: FormSection[], id: number) {
    for (const section of sections) {
        const question = section.questions.find((q) => q.id === String(id));
        if (question) return { section, question };
    }
    return null;
}

function labelOf(sections: FormSection[], id: number, fallback: string) {
    const found = findQuestion(sections, id);
    return found ? `Seção ${found.section.order} · Q${found.question.order}` : fallback;
}

function triggerText(sections: FormSection[], rule: DisplayRule) {
    const source = findQuestion(sections, rule.sourceQuestionId)?.question;
    if (!source) return rule.triggerLabel;
    return triggerOptionsFor(source).find((o) => o.value === rule.triggerValue)?.label ?? rule.triggerLabel;
}

export function RegrasExibicao({ question, ctx }: { question: FormQuestion; ctx: RulesContext }) {
    const [adding, setAdding] = useState(false);
    const [sourceId, setSourceId] = useState<string>("");
    const [trigger, setTrigger] = useState<string>("");
    const [saving, setSaving] = useState(false);

    const questionId = Number(question.id);
    const affectingRules = ctx.rules.filter((r) => r.targetQuestionId === questionId);
    const triggeredRules = ctx.rules.filter((r) => r.sourceQuestionId === questionId);

    // Só questões que vêm ANTES desta, na ordem do questionário, podem ser origem.
    const candidates: { question: FormQuestion; position: string; title: string }[] = [];
    outer: for (const section of [...ctx.sections].sort((a, b) => a.order - b.order)) {
        for (const q of [...section.questions].sort((a, b) => a.order - b.order)) {
            if (q.id === question.id) break outer;
            if (RULE_SOURCE_TYPES.includes(q.type)) {
                candidates.push({ question: q, position: `Seção ${section.order} · Q${q.order}`, title: shorten(q.title || "Sem enunciado", 90) });
            }
        }
    }

    const sourceCandidate = candidates.find((c) => c.question.id === sourceId);
    const source = sourceCandidate?.question;
    const triggerOptions = source ? triggerOptionsFor(source) : [];
    const selectedTrigger = triggerOptions.find((o) => o.value === trigger);

    // `items` faz o botão do Select mostrar o texto escolhido, e não o id interno.
    const candidateItems = candidates.map((c) => ({ value: c.question.id, label: `${c.position} — ${c.title}` }));

    const reset = () => { setAdding(false); setSourceId(""); setTrigger(""); };

    const save = async () => {
        if (!sourceId || !trigger) return;
        setSaving(true);
        const ok = await ctx.onAddRule(question.id, sourceId, trigger);
        setSaving(false);
        if (ok) reset();
    };

    return (
        <div className="mt-3 p-3 border rounded-lg space-y-3 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" /> Regras de exibição
                </Label>
                {!adding && (
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAdding(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar regra
                    </Button>
                )}
            </div>

            {affectingRules.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem regra: esta questão aparece sempre.</p>
            ) : (
                <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <EyeOff className="w-3.5 h-3.5" /> Fica escondida, e deixa de ser obrigatória, a menos que:
                    </p>
                    {affectingRules.map((rule) => {
                        const src = findQuestion(ctx.sections, rule.sourceQuestionId)?.question;
                        return (
                            <div key={rule.id} className="flex items-center justify-between gap-2 text-xs bg-background border rounded-md px-2 py-1.5">
                                <span>
                                    <strong>{labelOf(ctx.sections, rule.sourceQuestionId, rule.sourceLabel)}</strong>
                                    {" "}«{shorten(src?.title ?? rule.sourceStatement, 40)}» {" "}= <strong>{triggerText(ctx.sections, rule)}</strong>
                                </span>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => ctx.onDeleteRule(rule.id)} title="Remover regra">
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        );
                    })}
                    {affectingRules.length > 1 && (
                        <p className="text-[11px] text-muted-foreground">Com mais de uma regra, basta uma delas ser verdadeira para a questão aparecer.</p>
                    )}
                </div>
            )}

            {triggeredRules.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Esta questão controla:</p>
                    {triggeredRules.map((rule) => (
                        <p key={rule.id} className="text-xs flex items-center gap-1">
                            <CornerDownRight className="w-3 h-3 text-muted-foreground" />
                            Se responder <strong>{triggerText(ctx.sections, rule)}</strong>, mostra <strong>{labelOf(ctx.sections, rule.targetQuestionId, rule.targetLabel)}</strong>
                        </p>
                    ))}
                </div>
            )}

            {adding && (
                <div className="space-y-4 border rounded-lg bg-background p-3 sm:p-4 shadow-sm">
                    <p className="text-sm font-semibold">Nova regra de exibição</p>

                    {candidates.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            Não há questão anterior que possa disparar uma regra (Sim/Não, Escolha Única, Múltipla Escolha ou Escala de 1 a 5).
                        </p>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-2">
                                    <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold">1</span>
                                    Questão de origem (que vem antes desta)
                                </Label>
                                <Select
                                    items={candidateItems}
                                    value={sourceId || undefined}
                                    onValueChange={(v) => { setSourceId(v ?? ""); setTrigger(""); }}
                                >
                                    <SelectTrigger className="w-full h-9"><SelectValue placeholder="Escolha a questão de origem" /></SelectTrigger>
                                    <SelectContent alignItemWithTrigger={false} className="max-h-64">
                                        {candidates.map((c) => (
                                            <SelectItem key={c.question.id} value={c.question.id}>
                                                <span className="flex flex-col items-start leading-tight py-0.5 max-w-[calc(var(--anchor-width)-3rem)]">
                                                    <span className="text-[11px] font-semibold text-primary">{c.position}</span>
                                                    <span className="max-w-full truncate" title={c.title}>{c.title}</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-2">
                                    <span className={`rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold ${source ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span>
                                    Resposta que faz esta questão aparecer
                                </Label>
                                <Select
                                    items={triggerOptions}
                                    value={trigger || undefined}
                                    onValueChange={(v) => setTrigger(v ?? "")}
                                    disabled={!source}
                                >
                                    <SelectTrigger className="w-full h-9">
                                        <SelectValue placeholder={source ? "Escolha a resposta" : "Escolha primeiro a questão de origem"} />
                                    </SelectTrigger>
                                    <SelectContent alignItemWithTrigger={false} className="max-h-64">
                                        {triggerOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Resumo em linguagem natural, para o admin conferir antes de salvar */}
                            <div className="text-xs rounded-md border border-dashed bg-muted/30 px-3 py-2 text-muted-foreground">
                                {source && selectedTrigger ? (
                                    <>
                                        Esta questão só vai aparecer se <strong className="text-foreground">{sourceCandidate?.position}</strong> for respondida com <strong className="text-foreground">{selectedTrigger.label}</strong>. Nos outros casos ela fica escondida e deixa de ser obrigatória.
                                    </>
                                ) : (
                                    "Escolha a origem e a resposta para ver o resumo da regra."
                                )}
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={reset}>Cancelar</Button>
                        <Button type="button" size="sm" disabled={!sourceId || !trigger || saving} onClick={save}>
                            {saving ? "Salvando..." : "Salvar regra"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
