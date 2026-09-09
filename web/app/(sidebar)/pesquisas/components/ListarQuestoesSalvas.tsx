'use client'

import { useEffect, useState } from "react";
import {
    loadQuestionnaire,
    updateSectionApi,
    deleteSectionApi,
    updateQuestionApi,
    deleteQuestionApi,
    createQuestion,
    createSection,
    toBackendType,
    type FormSection,
    type FormQuestion,
    type FrontendQuestionType
} from "@/lib/questionnaire";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, ArrowUp, ArrowDown, Plus, FolderPlus } from "lucide-react";
import toast from "react-hot-toast";

const QUESTION_TYPES_LABEL: { type: FrontendQuestionType; label: string }[] = [
    { type: "text", label: "Texto Livre" }, { type: "number", label: "Numérica" },
    { type: "date", label: "Data" }, { type: "time", label: "Hora" },
    { type: "boolean", label: "Sim / Não" }, { type: "single-choice", label: "Escolha Única" },
    { type: "multiple-choice", label: "Múltipla Escolha" }, { type: "rating-1-5", label: "Escala de 1 a 5" },
    { type: "photo", label: "Foto" }, { type: "multiple-photos", label: "Várias Fotos" },
    { type: "location", label: "Localização" }, { type: "audio", label: "Áudio" },
];

export default function ListarQuestoesSalvas({ researchId }: { researchId: string | number }) {
    const [sections, setSections] = useState<FormSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadQuestionnaire(Number(researchId))
            .then(setSections)
            .catch(() => toast.error("Erro ao carregar questionário salvo."))
            .finally(() => setIsLoading(false));
    }, [researchId]);

    // Recarrega do banco para manter sincronizado
    const reload = async () => {
        const reloaded = await loadQuestionnaire(Number(researchId));
        setSections(reloaded);
    };

    // ================= SEÇÕES (Salva no Banco Imediatamente) =================

    const handleAddSection = async () => {
        try {
            const maxOrder = sections.reduce((max, s) => Math.max(max, s.order), 0);
            const nextOrder = maxOrder + 1;
            const newSec = await createSection(`Nova Seção ${nextOrder}`, nextOrder, Number(researchId));

            // Cria uma questão padrão inicial na seção nova
            await createQuestion({
                statement: "Nova Pergunta",
                type: "FREE_TEXT",
                isRequired: false,
                order: 1,
                sectionId: newSec.id,
            });

            toast.success("Seção criada e salva com sucesso!");
            await reload();
        } catch (e) {
            toast.error("Erro ao criar nova seção.");
        }
    };

    const handleBlurSectionTitle = async (sectionId: string, title: string) => {
        if (sectionId.length > 10 && sectionId.includes("-")) return; // Ignora se for ID temporário não salvo
        try {
            await updateSectionApi(Number(sectionId), { title });
            toast.success("Título da seção atualizado!", { id: "sec-title", duration: 1500 });
        } catch (e) {
            toast.error("Erro ao atualizar título da seção.");
        }
    };

    const moveSection = async (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sections.length) return;

        const updated = [...sections];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);

        // Atualiza ordens no banco imediatamente
        try {
            for (let i = 0; i < updated.length; i++) {
                const sec = updated[i];
                if (!(sec.id.length > 10 && sec.id.includes("-"))) {
                    await updateSectionApi(Number(sec.id), { order: i + 1 });
                }
            }
            setSections(updated.map((s, i) => ({ ...s, order: i + 1 })));
            toast.success("Ordem da seção atualizada!", { id: "sec-order", duration: 1500 });
        } catch (e) {
            toast.error("Erro ao reordenar seções.");
        }
    };

    const handleDeleteSection = async (sectionId: string) => {
        if (sections.length === 1) return toast.error("A pesquisa deve conter pelo menos uma seção.");

        if (confirm("Tem certeza que deseja excluir esta seção e todas as suas questões?")) {
            try {
                await deleteSectionApi(Number(sectionId));
                setSections(prev => prev.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i + 1 })));
                toast.success("Seção excluída com sucesso!");
            } catch (e) {
                toast.error("Erro ao excluir seção.");
            }
        }
    };

    // ================= QUESTÕES (Salva no Banco Imediatamente) =================

    const handleBlurQuestionField = async (sectionId: string, questionId: string, field: string, value: any) => {
        if (questionId.length > 10 && questionId.includes("-")) return;
        try {
            const payload: any = {};
            payload[field === "title" ? "statement" : field === "type" ? "type" : field === "helpText" ? "helpText" : "isRequired"] =
                field === "type" ? toBackendType(value) : value;

            await updateQuestionApi(Number(questionId), payload);
            toast.success("Questão salva!", { id: "q-save", duration: 1000 });
        } catch (e) {
            toast.error("Erro ao salvar alteração na questão.");
        }
    };

    const updateLocalQuestionState = (sectionId: string, questionId: string, field: keyof FormQuestion, value: any) => {
        setSections(prev => prev.map(s => {
            if (s.id !== sectionId) return s;
            return {
                ...s,
                questions: s.questions.map(q => q.id === questionId ? { ...q, [field]: value } : q)
            };
        }));
    };

    const moveQuestion = async (sectionId: string, qIndex: number, direction: "up" | "down") => {
        const section = sections.find(s => s.id === sectionId);
        if (!section) return;

        const targetIndex = direction === "up" ? qIndex - 1 : qIndex + 1;
        if (targetIndex < 0 || targetIndex >= section.questions.length) return;

        const updatedQuestions = [...section.questions];
        const [moved] = updatedQuestions.splice(qIndex, 1);
        updatedQuestions.splice(targetIndex, 0, moved);

        try {
            for (let i = 0; i < updatedQuestions.length; i++) {
                const q = updatedQuestions[i];
                if (!(q.id.length > 10 && q.id.includes("-"))) {
                    await updateQuestionApi(Number(q.id), { order: i + 1 });
                }
            }
            setSections(prev => prev.map(s => s.id === sectionId ? { ...s, questions: updatedQuestions.map((q, i) => ({ ...q, order: i + 1 })) } : s));
            toast.success("Ordem da questão atualizada!", { id: "q-order", duration: 1000 });
        } catch (e) {
            toast.error("Erro ao reordenar questões.");
        }
    };

    const handleAddQuestionToSection = async (sectionId: string) => {
        try {
            const section = sections.find(s => s.id === sectionId);
            const maxOrder = section?.questions.reduce((max, q) => Math.max(max, q.order), 0) ?? 0;
            const nextOrder = maxOrder + 1;

            await createQuestion({
                statement: "Nova Pergunta",
                type: "FREE_TEXT",
                isRequired: false,
                order: nextOrder,
                sectionId: Number(sectionId),
            });

            toast.success("Nova questão adicionada!");
            await reload();
        } catch (e) {
            toast.error("Erro ao adicionar questão.");
        }
    };

    const handleDeleteQuestion = async (sectionId: string, questionId: string) => {
        const section = sections.find(s => s.id === sectionId);
        if (section && section.questions.length === 1) {
            return toast.error("A seção precisa ter pelo menos uma questão.");
        }

        if (confirm("Deseja excluir esta questão?")) {
            try {
                await deleteQuestionApi(Number(questionId));
                setSections(prev => prev.map(s => {
                    if (s.id !== sectionId) return s;
                    return {
                        ...s,
                        questions: s.questions.filter(q => q.id !== questionId).map((q, i) => ({ ...q, order: i + 1 }))
                    };
                }));
                toast.success("Questão excluída com sucesso!");
            } catch (e) {
                toast.error("Erro ao excluir questão.");
            }
        }
    };

    if (isLoading) return <div className="p-8 text-center flex justify-center"><Spinner /></div>;

    if (sections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border rounded-md">
                <p className="text-sm text-muted-foreground">
                    Esta pesquisa ainda não tem nenhuma seção ou questão.
                </p>
                <Button variant="outline" size="sm" onClick={handleAddSection}>
                    <FolderPlus className="w-4 h-4 mr-1.5" /> Criar Primeira Seção
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 pb-16">
            <div className="flex justify-between items-center bg-card sticky top-0 z-10 pb-3 border-b gap-4">
                <p className="text-xs text-muted-foreground">As alterações de texto salvam ao sair do campo (blur). Ordenação e exclusão são instantâneas.</p>
                <Button variant="outline" size="sm" onClick={handleAddSection}>
                    <FolderPlus className="w-4 h-4 mr-1.5" /> Adicionar Seção
                </Button>
            </div>

            {sections.map((section, sIndex) => (
                <div key={section.id} className="border-2 border-primary/20 bg-muted/20 p-4 rounded-xl space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b pb-3">
                        <div className="flex items-center gap-2 flex-1">
                            <span className="bg-primary text-primary-foreground font-bold px-2.5 py-1 rounded-md text-xs">
                                {section.order}
                            </span>
                            <Input
                                defaultValue={section.title}
                                onBlur={(e) => handleBlurSectionTitle(section.id, e.target.value)}
                                className="bg-background font-bold text-base uppercase tracking-wide"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => moveSection(sIndex, "up")} disabled={sIndex === 0} title="Mover Seção para Cima">
                                <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => moveSection(sIndex, "down")} disabled={sIndex === sections.length - 1} title="Mover Seção para Baixo">
                                <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSection(section.id)} title="Excluir Seção">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3 pl-2 md:pl-6 border-l-2 border-primary/20">
                        {section.questions.map((q, qIndex) => (
                            <Card key={q.id} className="shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between py-2.5 bg-muted/40 border-b">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">
                                            Q{q.order}
                                        </span>
                                    </CardTitle>
                                    <div className="flex items-center gap-1">
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveQuestion(section.id, qIndex, "up")} disabled={qIndex === 0} title="Mover para cima">
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveQuestion(section.id, qIndex, "down")} disabled={qIndex === section.questions.length - 1} title="Mover para baixo">
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteQuestion(section.id, q.id)} title="Excluir questão">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Enunciado</Label>
                                        <Input
                                            defaultValue={q.title}
                                            onChange={(e) => updateLocalQuestionState(section.id, q.id, "title", e.target.value)}
                                            onBlur={(e) => handleBlurQuestionField(section.id, q.id, "title", e.target.value)}
                                            placeholder="Enunciado da pergunta"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Texto de Ajuda</Label>
                                        <Input
                                            defaultValue={q.helpText}
                                            onChange={(e) => updateLocalQuestionState(section.id, q.id, "helpText", e.target.value)}
                                            onBlur={(e) => handleBlurQuestionField(section.id, q.id, "helpText", e.target.value)}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-1">
                                        <div className="space-y-1 flex-1 w-full">
                                            <Label className="text-xs">Tipo de Resposta</Label>
                                            <Select
                                                value={q.type}
                                                onValueChange={(val) => {
                                                    updateLocalQuestionState(section.id, q.id, "type", val);
                                                    handleBlurQuestionField(section.id, q.id, "type", val);
                                                }}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {QUESTION_TYPES_LABEL.map((item) => (
                                                        <SelectItem key={item.type} value={item.type}>{item.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center space-x-2 sm:pt-5">
                                            <Switch
                                                checked={q.required}
                                                onCheckedChange={(c) => {
                                                    updateLocalQuestionState(section.id, q.id, "required", c);
                                                    handleBlurQuestionField(section.id, q.id, "required", c);
                                                }}
                                            />
                                            <Label className="cursor-pointer text-xs">Obrigatória</Label>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        <Button type="button" variant="outline" size="sm" onClick={() => handleAddQuestionToSection(section.id)} className="w-full border-dashed">
                            <Plus className="w-4 h-4 mr-1.5" /> Adicionar Nova Questão nesta Seção
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}