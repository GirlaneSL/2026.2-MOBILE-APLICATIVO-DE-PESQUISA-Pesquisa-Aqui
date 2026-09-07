'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Save, Trash2, X, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export type QuestionType =
    | "text"
    | "number"
    | "date"
    | "time"
    | "boolean"
    | "single-choice"
    | "multiple-choice"
    | "rating-1-5"
    | "photo"
    | "multiple-photos"
    | "location"
    | "audio";

export interface Option {
    id: string;
    text: string;
}

export interface Question {
    id: string;
    title: string;
    type: QuestionType;
    helpText: string;
    required: boolean;
    order: number;
    section: string;
    options: Option[];
}

interface MontarPesquisaFormProps {
    researchId?: string | number;
    initialQuestions?: Question[];
    onSuccess?: (questions: Question[]) => void;
}

const QUESTION_TYPES_LABEL: { type: QuestionType; label: string }[] = [
    { type: "text", label: "Texto Livre" },
    { type: "number", label: "Numérica" },
    { type: "date", label: "Data" },
    { type: "time", label: "Hora" },
    { type: "boolean", label: "Sim / Não" },
    { type: "single-choice", label: "Escolha Única" },
    { type: "multiple-choice", label: "Múltipla Escolha" },
    { type: "rating-1-5", label: "Escala de 1 a 5" },
    { type: "photo", label: "Foto" },
    { type: "multiple-photos", label: "Várias Fotos" },
    { type: "location", label: "Localização" },
    { type: "audio", label: "Áudio" },
];

export default function MontarPesquisaForm({
    researchId,
    initialQuestions,
    onSuccess,
}: MontarPesquisaFormProps) {
    const createNewQuestion = (order: number): Question => ({
        id: crypto.randomUUID(),
        title: "",
        type: "text",
        helpText: "",
        required: false,
        order,
        section: "Geral",
        options: [{ id: crypto.randomUUID(), text: "Opção 1" }],
    });

    const [questions, setQuestions] = useState<Question[]>(
        initialQuestions && initialQuestions.length > 0 ? initialQuestions : [createNewQuestion(1)]
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (researchId && (!initialQuestions || initialQuestions.length === 0)) {
            setIsLoading(true);
            fetch(`http://localhost:3001/research/${researchId}/questions`, {
                credentials: 'include',
            })
                .then(async (res) => {
                    if (!res.ok) throw new Error("Erro ao carregar perguntas da pesquisa");
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setQuestions(
                            data
                                .map((q, idx) => ({
                                    ...q,
                                    helpText: q.helpText || "",
                                    section: q.section || "Geral",
                                    order: q.order ?? idx + 1,
                                    options: q.options || [{ id: crypto.randomUUID(), text: "Opção 1" }],
                                }))
                                .sort((a, b) => a.order - b.order)
                        );
                    }
                })
                .catch((err) => {
                    toast.error(err instanceof Error ? err.message : "Erro ao carregar perguntas", {
                        id: `load-questions-error-${researchId}`,
                    });
                })
                .finally(() => setIsLoading(false));
        }
    }, [researchId, initialQuestions]);

    const addQuestion = () => {
        const nextOrder = questions.length + 1;
        setQuestions((prev) => [...prev, createNewQuestion(nextOrder)]);

        toast.success(`Questão #${nextOrder} adicionada!`, {
            id: 'add-question-toast',
            duration: 2000,
        });
    };

    const confirmRemoveQuestion = (id: string, order: number) => {
        if (questions.length === 1) {
            toast.error("A pesquisa deve conter pelo menos uma questão.", {
                id: 'min-questions-error',
            });
            return;
        }

        toast(
            (t) => (
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">
                        Deseja excluir a Pergunta #{order}?
                    </span>
                    <div className="flex justify-end gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toast.dismiss(t.id)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                toast.dismiss(t.id);
                                setQuestions((prev) =>
                                    prev
                                        .filter((q) => q.id !== id)
                                        .map((q, idx) => ({ ...q, order: idx + 1 }))
                                );
                                toast.success(`Pergunta #${order} removida!`, {
                                    id: 'remove-question-success',
                                });
                            }}
                        >
                            Excluir
                        </Button>
                    </div>
                </div>
            ),
            {
                id: `delete-q-${id}`,
                duration: 5000,
            }
        );
    };

    const updateQuestion = (id: string, field: keyof Omit<Question, "id" | "options">, value: any) => {
        setQuestions((prev) =>
            prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
        );
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
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.id === questionId) {
                    return {
                        ...q,
                        options: [...q.options, { id: crypto.randomUUID(), text: `Opção ${q.options.length + 1}` }],
                    };
                }
                return q;
            })
        );
    };

    const removeOption = (questionId: string, optionId: string) => {
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.id === questionId) {
                    return { ...q, options: q.options.filter((opt) => opt.id !== optionId) };
                }
                return q;
            })
        );
    };

    const updateOption = (questionId: string, optionId: string, text: string) => {
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.id === questionId) {
                    return {
                        ...q,
                        options: q.options.map((opt) => (opt.id === optionId ? { ...opt, text } : opt)),
                    };
                }
                return q;
            })
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            if (researchId) {
                const response = await fetch(`http://localhost:3001/research/${researchId}/questions`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ questions }),
                });

                if (!response.ok) throw new Error("Erro ao salvar as perguntas.");
            }

            toast.success("Questões salvas com sucesso!", {
                id: 'save-questions-success',
            });

            if (onSuccess) {
                onSuccess(questions);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao salvar alterações.", {
                id: 'save-questions-error',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const hasOptions = (type: QuestionType) => type === "single-choice" || type === "multiple-choice";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Spinner />
                <span className="ml-2 text-sm text-muted-foreground">Carregando perguntas...</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto space-y-6 max-h-[70vh] px-1">
            <div className="space-y-4 m-1">
                {questions.map((q, index) => (
                    <Card key={q.id}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <span>Pergunta #{q.order}</span>
                                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    Seção: {q.section || "Geral"}
                                </span>
                            </CardTitle>

                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveQuestion(index, "up")}
                                    disabled={index === 0}
                                    title="Mover para cima"
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveQuestion(index, "down")}
                                    disabled={index === questions.length - 1}
                                    title="Mover para baixo"
                                >
                                    <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => confirmRemoveQuestion(q.id, q.order)}
                                    disabled={questions.length === 1}
                                    title="Remover pergunta"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2 space-y-1">
                                    <Label htmlFor={`section-${q.id}`}>Seção</Label>
                                    <Input
                                        id={`section-${q.id}`}
                                        placeholder="Ex: Dados Demográficos, Experiência..."
                                        value={q.section}
                                        onChange={(e) => updateQuestion(q.id, "section", e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor={`order-${q.id}`}>Ordem</Label>
                                    <Input
                                        id={`order-${q.id}`}
                                        type="number"
                                        min={1}
                                        value={q.order}
                                        onChange={(e) => updateQuestion(q.id, "order", Number(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor={`title-${q.id}`}>Enunciado da Pergunta*</Label>
                                <Input
                                    id={`title-${q.id}`}
                                    placeholder="Ex: Como você avalia o suporte?"
                                    value={q.title}
                                    onChange={(e) => updateQuestion(q.id, "title", e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor={`helpText-${q.id}`}>Texto de Ajuda / Instrução</Label>
                                <Input
                                    id={`helpText-${q.id}`}
                                    placeholder="Ex: Selecione apenas a opção mais adequada ou anexe uma foto legível"
                                    value={q.helpText}
                                    onChange={(e) => updateQuestion(q.id, "helpText", e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div className="space-y-1 flex-1 w-full">
                                    <Label>Tipo de Resposta*</Label>
                                    <Select
                                        value={q.type}
                                        onValueChange={(val) => updateQuestion(q.id, "type", val as QuestionType)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {QUESTION_TYPES_LABEL.map((item) => (
                                                <SelectItem key={item.type} value={item.type}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center space-x-2 sm:pt-6">
                                    <Switch
                                        id={`required-${q.id}`}
                                        checked={q.required}
                                        onCheckedChange={(checked) => updateQuestion(q.id, "required", checked)}
                                    />
                                    <Label htmlFor={`required-${q.id}`} className="cursor-pointer">
                                        Obrigatória
                                    </Label>
                                </div>
                            </div>

                            {q.type === "boolean" && (
                                <p className="text-xs text-muted-foreground italic border-l-2 pl-2">
                                    Resposta fixada em &quot;Sim&quot; ou &quot;Não&quot;.
                                </p>
                            )}

                            {q.type === "rating-1-5" && (
                                <p className="text-xs text-muted-foreground italic border-l-2 pl-2">
                                    Escala de pontuação fixa variando de 1 a 5.
                                </p>
                            )}

                            {hasOptions(q.type) && (
                                <div className="space-y-3 pt-3 border-t mt-3">
                                    <Label>Alternativas</Label>
                                    {q.options.map((opt, optIndex) => (
                                        <div key={opt.id} className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                                                {optIndex + 1}
                                            </div>
                                            <Input
                                                value={opt.text}
                                                onChange={(e) => updateOption(q.id, opt.id, e.target.value)}
                                                placeholder={`Alternativa ${optIndex + 1}`}
                                                required
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => removeOption(q.id, opt.id)}
                                                disabled={q.options.length === 1}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="link"
                                        className="p-0 h-auto text-primary"
                                        onClick={() => addOption(q.id)}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Adicionar alternativa
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex items-center justify-between p-3 sticky bottom-0 bg-background rounded-xl border shadow">
                <Button type="button" variant="outline" onClick={addQuestion} disabled={isSaving}>
                    <Plus className="w-4 h-4" />
                    Adicionar Questão
                </Button>

                <Button className="verde" type="submit" disabled={isSaving}>
                    {isSaving ? (
                        <div className="flex items-center gap-2">
                            <Spinner />
                            <span>Salvando...</span>
                        </div>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>Salvar Questões</span>
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}