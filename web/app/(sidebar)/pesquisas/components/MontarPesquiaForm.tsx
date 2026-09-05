'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

type QuestionType = "text" | "textarea" | "multiple-choice" | "checkbox";

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string;
    title: string;
    type: QuestionType;
    required: boolean;
    options: Option[];
}

export default function MontarPesquisaForm() {
    const [questions, setQuestions] = useState<Question[]>([
        {
            id: crypto.randomUUID(),
            title: "",
            type: "text",
            required: false,
            options: [{ id: crypto.randomUUID(), text: "Opção 1" }],
        },
    ]);

    // --- Funções para gerenciar Perguntas ---
    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                id: crypto.randomUUID(),
                title: "",
                type: "text",
                required: false,
                options: [{ id: crypto.randomUUID(), text: "Opção 1" }],
            },
        ]);
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter((q) => q.id !== id));
    };

    const updateQuestion = (id: string, field: keyof Omit<Question, "id" | "options">, value: any) => {
        setQuestions(
            questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
        );
    };

    // --- Funções para gerenciar Alternativas (Opções) ---
    const addOption = (questionId: string) => {
        setQuestions(
            questions.map((q) => {
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
        setQuestions(
            questions.map((q) => {
                if (q.id === questionId) {
                    return { ...q, options: q.options.filter((opt) => opt.id !== optionId) };
                }
                return q;
            })
        );
    };

    const updateOption = (questionId: string, optionId: string, text: string) => {
        setQuestions(
            questions.map((q) => {
                if (q.id === questionId) {
                    return {
                        ...q,
                        options: q.options.map((opt) =>
                            opt.id === optionId ? { ...opt, text } : opt
                        ),
                    };
                }
                return q;
            })
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Dados da Pesquisa prontos para envio:", questions);
    };

    return (
        <form onSubmit={handleSubmit} className="mx-auto space-y-6 p-4">
            <div className="space-y-4">
                {questions.map((q, index) => (
                    <Card key={q.id}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Pergunta {index + 1}</CardTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeQuestion(q.id)}
                                disabled={questions.length === 1}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Enunciado da Pergunta */}
                            <div className="space-y-2">
                                <Label htmlFor={`title-${q.id}`}>Enunciado da Pergunta</Label>
                                <Input
                                    id={`title-${q.id}`}
                                    placeholder="Ex: Qual sua cor favorita?"
                                    value={q.title}
                                    onChange={(e) => updateQuestion(q.id, "title", e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                {/* Tipo de Resposta */}
                                <div className="space-y-2 flex-1 w-full">
                                    <Label>Tipo de Resposta</Label>
                                    <Select
                                        value={q.type}
                                        onValueChange={(value) => updateQuestion(q.id, "type", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Texto Curto</SelectItem>
                                            <SelectItem value="textarea">Parágrafo (Texto Longo)</SelectItem>
                                            <SelectItem value="multiple-choice">Múltipla Escolha</SelectItem>
                                            <SelectItem value="checkbox">Caixas de Seleção</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Switch Obrigatório */}
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

                            {/* Renderização Condicional das Alternativas */}
                            {(q.type === "multiple-choice" || q.type === "checkbox") && (
                                <div className="space-y-3 pt-4 border-t mt-4">
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
                                                disabled={q.options.length === 1} // Impede deletar a última opção
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

            <div className="flex items-center justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={addQuestion}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pergunta
                </Button>

                <Button className={"verde"} type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Pesquisa
                </Button>
            </div>
        </form>
    );
}