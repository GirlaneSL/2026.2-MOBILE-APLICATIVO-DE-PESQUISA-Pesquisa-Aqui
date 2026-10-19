import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    ArrowDown, ArrowUp, CalendarDays, Camera, ChevronDown, CircleDot, Clock, GitBranch, Hash,
    Images, ListChecks, MapPin, Mic, Plus, Star, ToggleLeft, Trash2, Type, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FormQuestion, FrontendQuestionType } from "@/lib/questionnaire";
import { RegrasExibicao, type RulesContext } from "./RegrasExibicao";

export const QUESTION_TYPES_LABEL: { type: FrontendQuestionType; label: string }[] = [
    { type: "text", label: "Texto Livre" }, { type: "number", label: "Numérica" },
    { type: "date", label: "Data" }, { type: "time", label: "Hora" },
    { type: "boolean", label: "Sim / Não" }, { type: "single-choice", label: "Escolha Única" },
    { type: "multiple-choice", label: "Múltipla Escolha" }, { type: "rating-1-5", label: "Escala de 1 a 5" },
    { type: "photo", label: "Foto" }, { type: "multiple-photos", label: "Várias Fotos" },
    { type: "location", label: "Localização" }, { type: "audio", label: "Áudio" },
];

const QUESTION_TYPE_ICONS: Record<FrontendQuestionType, LucideIcon> = {
    "text": Type, "number": Hash, "date": CalendarDays, "time": Clock,
    "boolean": ToggleLeft, "single-choice": CircleDot, "multiple-choice": ListChecks, "rating-1-5": Star,
    "photo": Camera, "multiple-photos": Images, "location": MapPin, "audio": Mic,
};

const TYPE_ITEMS = QUESTION_TYPES_LABEL.map((item) => ({ value: item.type, label: item.label }));

export const hasOptions = (type: FrontendQuestionType) => type === "single-choice" || type === "multiple-choice";

export interface QuestionActions {
    handleTypeChange: (sectionId: string, questionId: string, newType: FrontendQuestionType) => void;
    handleBlurQuestionField: (sectionId: string, questionId: string, field: string, value: any) => void;
    updateLocalQuestionState: (sectionId: string, questionId: string, field: keyof FormQuestion, value: any) => void;
    moveQuestion: (sectionId: string, qIndex: number, direction: "up" | "down") => void;
    handleDeleteQuestion: (sectionId: string, questionId: string) => void;
}

export interface OptionActions {
    handleAddOption: (sectionId: string, questionId: string) => void;
    handleBlurOptionText: (optionId: string, text: string) => void;
    handleUpdateOptionLocal: (sectionId: string, questionId: string, optionId: string, text: string) => void;
    handleDeleteOption: (sectionId: string, questionId: string, optionId: string) => void;
    moveOption: (sectionId: string, questionId: string, optIndex: number, direction: "up" | "down") => void;
}

interface QuestionCardProps {
    sectionId: string;
    q: FormQuestion;
    qIndex: number;
    totalQuestions: number;
    qActions: QuestionActions;
    optActions: OptionActions;
    rulesCtx: RulesContext;
    open: boolean;
    onToggle: () => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            {children}
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
    );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-lg border bg-background p-4 space-y-3">
            <h4 className="text-[13px] font-semibold text-muted-foreground">{title}</h4>
            {children}
        </div>
    );
}

export function QuestionCard({ sectionId, q, qIndex, totalQuestions, qActions, optActions, rulesCtx, open, onToggle }: QuestionCardProps) {
    const TypeIcon = QUESTION_TYPE_ICONS[q.type] ?? Type;
    const typeLabel = QUESTION_TYPES_LABEL.find((t) => t.type === q.type)?.label ?? q.type;
    const questionId = Number(q.id);
    const affectedByRules = rulesCtx.rules.filter((r) => r.targetQuestionId === questionId).length;
    const controlsRules = rulesCtx.rules.filter((r) => r.sourceQuestionId === questionId).length;

    const setLocal = (field: keyof FormQuestion, value: any) => qActions.updateLocalQuestionState(sectionId, q.id, field, value);
    const save = (field: string, value: any) => qActions.handleBlurQuestionField(sectionId, q.id, field, value);
    const toNumber = (text: string) => (text === "" ? undefined : parseInt(text));
    const toNullableNumber = (text: string) => (text === "" ? null : parseInt(text));

    const hasSettings = ["text", "rating-1-5", "multiple-choice", "number", "date", "multiple-photos", "audio"].includes(q.type);

    const summary = [typeLabel, hasOptions(q.type) ? `${q.options?.length ?? 0} opções` : null].filter(Boolean).join(" · ");

    return (
        <div className={cn("transition-colors", open && "bg-muted/10")}>
            {/* Linha-resumo: sempre visível */}
            <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 hover:bg-muted/40">
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    className="flex flex-1 min-w-0 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
                >
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                    <span className="w-6 shrink-0 text-xs font-semibold text-muted-foreground sm:w-8">Q{q.order}</span>
                    <span className="hidden size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary sm:grid">
                        <TypeIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className={cn("line-clamp-2 text-sm font-medium sm:line-clamp-1", !q.title && "italic text-muted-foreground")}>
                            {q.title || "Questão sem enunciado"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{summary}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1.5 md:flex">
                        {q.required && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Obrigatória</span>
                        )}
                        {affectedByRules > 0 && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                                title="Só aparece quando uma regra de exibição é atendida"
                            >
                                <GitBranch className="size-3" /> Condicional
                            </span>
                        )}
                        {controlsRules > 0 && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                                title="Suas respostas controlam a exibição de outras questões"
                            >
                                <GitBranch className="size-3" /> Controla {controlsRules}
                            </span>
                        )}
                    </span>
                </button>

                <div className="flex shrink-0 items-center">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Mover para cima" onClick={() => qActions.moveQuestion(sectionId, qIndex, "up")} disabled={qIndex === 0}>
                        <ArrowUp className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Mover para baixo" onClick={() => qActions.moveQuestion(sectionId, qIndex, "down")} disabled={qIndex === totalQuestions - 1}>
                        <ArrowDown className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" title="Excluir questão" onClick={() => qActions.handleDeleteQuestion(sectionId, q.id)}>
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Edição: aparece ao expandir */}
            {open && (
                <div className="space-y-4 border-t px-4 py-5 sm:px-6 md:pl-16">
                    <Field label="Enunciado">
                        <Input
                            className="h-10"
                            value={q.title || ""}
                            onChange={(e) => setLocal("title", e.target.value)}
                            onBlur={(e) => save("title", e.target.value)}
                            placeholder="Digite a pergunta que será feita ao entrevistado"
                        />
                    </Field>

                    <Field label="Texto de ajuda (opcional)">
                        <Input
                            value={q.helpText || ""}
                            onChange={(e) => setLocal("helpText", e.target.value)}
                            onBlur={(e) => save("helpText", e.target.value)}
                            placeholder="Uma orientação curta para o pesquisador"
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                        <Field label="Tipo de resposta">
                            <Select items={TYPE_ITEMS} value={q.type} onValueChange={(val) => val && qActions.handleTypeChange(sectionId, q.id, val as FrontendQuestionType)}>
                                <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    {QUESTION_TYPES_LABEL.map((item) => (
                                        <SelectItem key={item.type} value={item.type}>{item.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
                            <div>
                                <Label className="cursor-pointer text-sm font-medium">Resposta obrigatória</Label>
                                <p className="text-[11px] text-muted-foreground">Questões escondidas por regra não são cobradas.</p>
                            </div>
                            <Switch
                                checked={q.required}
                                onCheckedChange={(c) => {
                                    setLocal("required", c);
                                    save("isRequired", c);
                                }}
                            />
                        </div>
                    </div>

                    {/* Configurações específicas do tipo */}
                    {hasSettings && (
                        <Block title="Limites e configurações">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {q.type === "text" && (
                                    <Field label="Limite de caracteres (opcional)">
                                        <Input type="number" min="1" value={q.maxLength || ""} onChange={(e) => setLocal("maxLength", toNumber(e.target.value))} onBlur={(e) => save("maxLength", toNullableNumber(e.target.value))} />
                                    </Field>
                                )}

                                {q.type === "rating-1-5" && (
                                    <>
                                        <Field label="Rótulo do menor valor (1)">
                                            <Input placeholder="Ex: Muito ruim" value={q.scaleLeftLabel || ""} onChange={(e) => setLocal("scaleLeftLabel", e.target.value)} onBlur={(e) => save("scaleLeftLabel", e.target.value === "" ? null : e.target.value)} />
                                        </Field>
                                        <Field label="Rótulo do maior valor (5)">
                                            <Input placeholder="Ex: Muito bom" value={q.scaleRightLabel || ""} onChange={(e) => setLocal("scaleRightLabel", e.target.value)} onBlur={(e) => save("scaleRightLabel", e.target.value === "" ? null : e.target.value)} />
                                        </Field>
                                    </>
                                )}

                                {q.type === "multiple-choice" && (
                                    <>
                                        <Field label="Mínimo de escolhas">
                                            <Input type="number" min="1" value={q.minSelections || 1} onChange={(e) => setLocal("minSelections", parseInt(e.target.value) || 1)} onBlur={(e) => save("minSelections", parseInt(e.target.value) || 1)} />
                                        </Field>
                                        <Field label="Máximo de escolhas">
                                            <Input type="number" min="1" value={q.maxSelections || 2} onChange={(e) => setLocal("maxSelections", parseInt(e.target.value) || 2)} onBlur={(e) => save("maxSelections", parseInt(e.target.value) || 2)} />
                                        </Field>
                                    </>
                                )}

                                {q.type === "number" && (
                                    <>
                                        <Field label="Valor mínimo (opcional)">
                                            <Input type="number" value={q.minValue ?? ""} onChange={(e) => setLocal("minValue", toNumber(e.target.value))} onBlur={(e) => save("minValue", toNullableNumber(e.target.value))} />
                                        </Field>
                                        <Field label="Valor máximo (opcional)">
                                            <Input type="number" value={q.maxValue ?? ""} onChange={(e) => setLocal("maxValue", toNumber(e.target.value))} onBlur={(e) => save("maxValue", toNullableNumber(e.target.value))} />
                                        </Field>
                                    </>
                                )}

                                {q.type === "date" && (
                                    <>
                                        <Field label="A partir da data (opcional)">
                                            <Input type="date" value={q.minDate || ""} onChange={(e) => setLocal("minDate", e.target.value)} onBlur={(e) => save("minDate", e.target.value === "" ? null : e.target.value)} />
                                        </Field>
                                        <Field label="Até a data (opcional)">
                                            <Input type="date" value={q.maxDate || ""} onChange={(e) => setLocal("maxDate", e.target.value)} onBlur={(e) => save("maxDate", e.target.value === "" ? null : e.target.value)} />
                                        </Field>
                                    </>
                                )}

                                {q.type === "multiple-photos" && (
                                    <Field label="Quantidade máxima de fotos (opcional)">
                                        <Input type="number" min="2" value={q.maxFiles || ""} onChange={(e) => setLocal("maxFiles", toNumber(e.target.value))} onBlur={(e) => save("maxFiles", toNullableNumber(e.target.value))} />
                                    </Field>
                                )}

                                {q.type === "audio" && (
                                    <Field label="Duração máxima (segundos)">
                                        <Input type="number" min="1" placeholder="Ex: 60" value={q.maxDuration || ""} onChange={(e) => setLocal("maxDuration", toNumber(e.target.value))} onBlur={(e) => save("maxDuration", toNullableNumber(e.target.value))} />
                                    </Field>
                                )}
                            </div>
                        </Block>
                    )}

                    {/* Opções de resposta */}
                    {hasOptions(q.type) && (
                        <Block title="Opções de resposta">
                            <div className="space-y-2">
                                {q.options?.map((opt, optIndex) => (
                                    <div key={opt.id} className="flex items-center gap-2">
                                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">{optIndex + 1}</span>
                                        <Input
                                            className="h-9 flex-1"
                                            value={opt.text}
                                            onChange={(e) => optActions.handleUpdateOptionLocal(sectionId, q.id, opt.id, e.target.value)}
                                            onBlur={(e) => optActions.handleBlurOptionText(opt.id, e.target.value)}
                                            placeholder={`Opção ${optIndex + 1}`}
                                            required
                                        />
                                        <div className="flex items-center">
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Mover para cima" onClick={() => optActions.moveOption(sectionId, q.id, optIndex, "up")} disabled={optIndex === 0}><ArrowUp className="size-4" /></Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Mover para baixo" onClick={() => optActions.moveOption(sectionId, q.id, optIndex, "down")} disabled={optIndex === (q.options?.length || 0) - 1}><ArrowDown className="size-4" /></Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" title="Excluir opção" onClick={() => optActions.handleDeleteOption(sectionId, q.id, opt.id)}><Trash2 className="size-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => optActions.handleAddOption(sectionId, q.id)} className="w-full border-dashed">
                                <Plus className="mr-1 size-4" /> Adicionar opção
                            </Button>
                        </Block>
                    )}

                    {/* Regras de exibição: quando esta questão aparece para o entrevistado */}
                    <RegrasExibicao question={q} ctx={rulesCtx} />
                </div>
            )}
        </div>
    );
}
