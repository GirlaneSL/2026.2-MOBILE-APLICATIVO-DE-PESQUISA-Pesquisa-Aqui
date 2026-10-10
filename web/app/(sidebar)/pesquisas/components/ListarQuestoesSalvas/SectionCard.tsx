import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormSection } from "@/lib/questionnaire";
import { QuestionCard, QuestionActions, OptionActions } from "./QuestionCard";
import type { RulesContext } from "./RegrasExibicao";

interface SectionCardProps {
    section: FormSection;
    sIndex: number;
    totalSections: number;
    onBlurTitle: (sectionId: string, title: string) => void;
    onMove: (index: number, direction: "up" | "down") => void;
    onDelete: (sectionId: string) => void;
    onAddQuestion: (sectionId: string) => void;
    qActions: QuestionActions;
    optActions: OptionActions;
    rulesCtx: RulesContext;
    openQuestionIds: Set<string>;
    onToggleQuestion: (questionId: string) => void;
}

export function SectionCard({
    section, sIndex, totalSections, onBlurTitle, onMove, onDelete, onAddQuestion,
    qActions, optActions, rulesCtx, openQuestionIds, onToggleQuestion,
}: SectionCardProps) {
    const [collapsed, setCollapsed] = useState(false);
    const total = section.questions.length;

    return (
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <header className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-3 sm:flex-nowrap sm:px-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title={collapsed ? "Expandir seção" : "Recolher seção"}
                    aria-expanded={!collapsed}
                    onClick={() => setCollapsed((c) => !c)}
                >
                    <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} />
                </Button>

                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    {section.order}
                </span>

                <Input
                    defaultValue={section.title}
                    onBlur={(e) => onBlurTitle(section.id, e.target.value)}
                    placeholder="Título da seção"
                    className="order-last h-9 basis-full border-transparent bg-transparent text-base font-semibold shadow-none hover:border-input focus-visible:bg-background sm:order-none sm:flex-1 sm:basis-0"
                />

                <span className="ml-auto hidden shrink-0 text-xs text-muted-foreground sm:ml-0 sm:inline">
                    {total} {total === 1 ? "questão" : "questões"}
                </span>

                <div className="ml-auto flex shrink-0 items-center sm:ml-0">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Mover seção para cima" onClick={() => onMove(sIndex, "up")} disabled={sIndex === 0}><ArrowUp className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Mover seção para baixo" onClick={() => onMove(sIndex, "down")} disabled={sIndex === totalSections - 1}><ArrowDown className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" title="Excluir seção" onClick={() => onDelete(section.id)}><Trash2 className="size-4" /></Button>
                </div>
            </header>

            {!collapsed && (
                <>
                    {total === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Esta seção ainda não tem questões.</p>
                    ) : (
                        <div className="divide-y">
                            {section.questions.map((q, qIndex) => (
                                <QuestionCard
                                    key={q.id}
                                    sectionId={section.id}
                                    q={q}
                                    qIndex={qIndex}
                                    totalQuestions={total}
                                    qActions={qActions}
                                    optActions={optActions}
                                    rulesCtx={rulesCtx}
                                    open={openQuestionIds.has(q.id)}
                                    onToggle={() => onToggleQuestion(q.id)}
                                />
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => onAddQuestion(section.id)}
                        className="flex w-full items-center justify-center gap-1.5 border-t px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:bg-primary/5"
                    >
                        <Plus className="size-4" /> Adicionar questão nesta seção
                    </button>
                </>
            )}
        </section>
    );
}
