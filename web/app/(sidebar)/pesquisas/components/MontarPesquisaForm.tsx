'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Save, Trash2, X, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { saveQuestionnaire, toBackendType } from "@/lib/questionnaire";

export type QuestionType =
    | "text" | "number" | "date" | "time" | "boolean"
    | "single-choice" | "multiple-choice" | "rating-1-5"
    | "photo" | "multiple-photos" | "location" | "audio";

export interface Option { id: string; text: string; }

export interface Question {
    id: string; title: string; type: QuestionType;
    helpText: string; required: boolean; order: number;
    section: string; options: Option[];
}

interface MontarPesquisaFormProps {
    researchId?: string | number;
    onSuccess?: (questions: Question[]) => void;
}

const QUESTION_TYPES_LABEL: { type: QuestionType; label: string }[] = [
    { type: "text", label: "Texto Livre" }, { type: "number", label: "Numérica" },
    { type: "date", label: "Data" }, { type: "time", label: "Hora" },
    { type: "boolean", label: "Sim / Não" }, { type: "single-choice", label: "Escolha Única" },
    { type: "multiple-choice", label: "Múltipla Escolha" }, { type: "rating-1-5", label: "Escala de 1 a 5" },
    { type: "photo", label: "Foto" }, { type: "multiple-photos", label: "Várias Fotos" },
    { type: "location", label: "Localização" }, { type: "audio", label: "Áudio" },
];

export default function MontarPesquisaForm({ researchId, onSuccess }: MontarPesquisaFormProps) {
    const createNewQuestion = (order: number): Question => ({
        id: crypto.randomUUID(), title: "", type: "text", helpText: "",
        required: false, order, section: "Geral",
        options: [{ id: crypto.randomUUID(), text: "Opção 1" }],
    });

    const [questions, setQuestions] = useState<Question[]>([createNewQuestion(1)]);
    const [isSaving, setIsSaving] = useState(false);

    const addQuestion = () => {
        const nextOrder = questions.length + 1;
        // Pega a seção da última pergunta criada para facilitar a digitação contínua na mesma seção
        const lastSection = questions[questions.length - 1]?.section || "Geral";
        const newQ = createNewQuestion(nextOrder);
        newQ.section = lastSection;
        
        setQuestions((prev) => [...prev, newQ]);
    };

    const confirmRemoveQuestion = (id: string, order: number) => {
        if (questions.length === 1) {
            toast.error("A pesquisa deve conter pelo menos uma questão.");
            return;
        }
        setQuestions((prev) =>
            prev.filter((q) => q.id !== id).map((q, idx) => ({ ...q, order: idx + 1 }))
        );
        toast.success(`Pergunta #${order} removida!`);
    };

    const updateQuestion = (id: string, field: keyof Omit<Question, "id" | "options">, value: any) => {
        setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
    };

    const moveQuestion = (currentIndex: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= questions.length) return;
        const updated = [...questions];
        const [movedItem] = updated.splice(currentIndex, 1);
        updated.splice(targetIndex, 0, movedItem);
        setQuestions(updated.map((item, idx) => ({ ...item, order: idx + 1 })));
    };

    const addOption = (questionId: string) => {
        setQuestions((prev) => prev.map((q) => {
            if (q.id === questionId) {
                return { ...q, options: [...q.options, { id: crypto.randomUUID(), text: `Opção ${q.options.length + 1}` }] };
            }
            return q;
        }));
    };

    const removeOption = (questionId: string, optionId: string) => {
        setQuestions((prev) => prev.map((q) => {
            if (q.id === questionId) return { ...q, options: q.options.filter((opt) => opt.id !== optionId) };
            return q;
        }));
    };

    const updateOption = (questionId: string, optionId: string, text: string) => {
        setQuestions((prev) => prev.map((q) => {
            if (q.id === questionId) return { ...q, options: q.options.map((opt) => (opt.id === optionId ? { ...opt, text } : opt)) };
            return q;
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!researchId) {
            toast.error("ID da pesquisa não encontrado.");
            return;
        }

        setIsSaving(true);
        try {
            // O saveQuestionnaire agrupa por seção automaticamente e cria as Seções e Questões no banco
            await saveQuestionnaire(Number(researchId), questions);
            toast.success("Seções e questões criadas com sucesso!");
            if (onSuccess) onSuccess(questions);
            setQuestions([createNewQuestion(1)]);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao salvar questionário.");
        } finally {
            setIsSaving(false);
        }
    };

    const hasOptions = (type: QuestionType) => type === "single-choice" || type === "multiple-choice";

    return (
        <form onSubmit={handleSubmit} className="mx-auto space-y-6 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-4 m-1">
                {questions.map((q, index) => (
                    <Card key={q.id}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <span>Questão #{q.order}</span>
                            </CardTitle>
                            <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon" onClick={() => moveQuestion(index, "up")} disabled={index === 0}>
                                    <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => moveQuestion(index, "down")} disabled={index === questions.length - 1}>
                                    <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => confirmRemoveQuestion(q.id, q.order)} disabled={questions.length === 1}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2 space-y-1">
                                    <Label htmlFor={`section-${q.id}`}>Nome da Seção*</Label>
                                    <Input 
                                        id={`section-${q.id}`} 
                                        placeholder="Ex: Dados Pessoais, Avaliação..." 
                                        value={q.section} 
                                        onChange={(e) => updateQuestion(q.id, "section", e.target.value)} 
                                        required 
                                    />
                                    <p className="text-[11px] text-muted-foreground">Questões com o mesmo nome de seção serão agrupadas juntas.</p>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor={`order-${q.id}`}>Ordem</Label>
                                    <Input id={`order-${q.id}`} type="number" min={1} value={q.order} onChange={(e) => updateQuestion(q.id, "order", Number(e.target.value))} required />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`title-${q.id}`}>Enunciado da Pergunta*</Label>
                                <Input id={`title-${q.id}`} placeholder="Ex: Qual é a sua idade?" value={q.title} onChange={(e) => updateQuestion(q.id, "title", e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`helpText-${q.id}`}>Texto de Ajuda / Instrução</Label>
                                <Input id={`helpText-${q.id}`} placeholder="Opcional" value={q.helpText} onChange={(e) => updateQuestion(q.id, "helpText", e.target.value)} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div className="space-y-1 flex-1 w-full">
                                    <Label>Tipo de Resposta* (12 tipos disponíveis)</Label>
                                    <Select value={q.type} onValueChange={(val) => updateQuestion(q.id, "type", val as QuestionType)}>
                                        <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                                        <SelectContent>
                                            {QUESTION_TYPES_LABEL.map((item) => (
                                                <SelectItem key={item.type} value={item.type}>{item.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2 sm:pt-6">
                                    <Switch id={`required-${q.id}`} checked={q.required} onCheckedChange={(checked) => updateQuestion(q.id, "required", checked)} />
                                    <Label htmlFor={`required-${q.id}`} className="cursor-pointer">Obrigatória</Label>
                                </div>
                            </div>
                            {hasOptions(q.type) && (
                                <div className="space-y-3 pt-3 border-t mt-3">
                                    <Label>Alternativas</Label>
                                    {q.options.map((opt, optIndex) => (
                                        <div key={opt.id} className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs">{optIndex + 1}</div>
                                            <Input value={opt.text} onChange={(e) => updateOption(q.id, opt.id, e.target.value)} required className="flex-1" />
                                            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" onClick={() => removeOption(q.id, opt.id)} disabled={q.options.length === 1}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="link" className="p-0 h-auto text-primary" onClick={() => addOption(q.id)}>
                                        <Plus className="w-4 h-4 mr-1" /> Adicionar alternativa
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="flex items-center justify-between p-3 sticky bottom-0 bg-background rounded-xl border shadow z-10">
                <Button type="button" variant="outline" onClick={addQuestion} disabled={isSaving}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Questão
                </Button>
                <Button className="bg-primary text-primary-foreground" type="submit" disabled={isSaving}>
                    {isSaving ? (
                        <div className="flex items-center gap-2"><Spinner /><span>Salvando seções e questões...</span></div>
                    ) : (
                        <><Save className="w-4 h-4 mr-2" /><span>Salvar Questionário</span></>
                    )}
                </Button>
            </div>
        </form>
    );
}