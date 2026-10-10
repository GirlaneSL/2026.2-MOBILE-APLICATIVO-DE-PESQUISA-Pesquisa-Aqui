import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
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
}

export function SectionCard({ section, sIndex, totalSections, onBlurTitle, onMove, onDelete, onAddQuestion, qActions, optActions, rulesCtx }: SectionCardProps) {
    return (
        <div className="border-2 border-primary/20 bg-muted/20 p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2 flex-1">
                    <span className="bg-primary text-primary-foreground font-bold px-2.5 py-1 rounded-md text-xs">{section.order}</span>
                    <Input
                        defaultValue={section.title}
                        onBlur={(e) => onBlurTitle(section.id, e.target.value)}
                        className="bg-background font-bold text-base uppercase tracking-wide"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => onMove(sIndex, "up")} disabled={sIndex === 0}><ArrowUp className="w-4 h-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onMove(sIndex, "down")} disabled={sIndex === totalSections - 1}><ArrowDown className="w-4 h-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(section.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
            </div>

            <div className="space-y-3 pl-2 md:pl-6 border-l-2 border-primary/20">
                {section.questions.map((q, qIndex) => (
                    <QuestionCard 
                        key={q.id}
                        sectionId={section.id}
                        q={q}
                        qIndex={qIndex}
                        totalQuestions={section.questions.length}
                        qActions={qActions}
                        optActions={optActions}
                        rulesCtx={rulesCtx}
                    />
                ))}

                <Button type="button" variant="outline" size="sm" onClick={() => onAddQuestion(section.id)} className="w-full border-dashed">
                    <Plus className="w-4 h-4 mr-1.5" /> Adicionar Nova Questão nesta Seção
                </Button>
            </div>
        </div>
    );
}