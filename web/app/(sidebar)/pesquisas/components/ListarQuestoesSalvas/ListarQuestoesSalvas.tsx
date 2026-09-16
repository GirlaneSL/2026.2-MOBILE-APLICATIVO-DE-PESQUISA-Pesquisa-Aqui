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
    createOptionApi,
    updateOptionApi,
    deleteOptionApi,
    type FormSection,
    type FormQuestion,
    type FrontendQuestionType
} from "@/lib/questionnaire";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";
import toast from "react-hot-toast";

import { SectionCard } from "./SectionCard";
import { QuestionActions, OptionActions, hasOptions } from "./QuestionCard";

export default function ListarQuestoesSalvas({ researchId }: { researchId: string | number }) {
    const [sections, setSections] = useState<FormSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadQuestionnaire(Number(researchId))
            .then(setSections)
            .catch(() => toast.error("Erro ao carregar questionário salvo."))
            .finally(() => setIsLoading(false));
    }, [researchId]);

    const reload = async () => {
        const reloaded = await loadQuestionnaire(Number(researchId));
        setSections(reloaded);
    };

    // ================= SEÇÕES =================
    const handleAddSection = async () => {
        try {
            const maxOrder = sections.reduce((max, s) => Math.max(max, s.order), 0);
            const nextOrder = maxOrder + 1;
            const newSec = await createSection(`Nova Seção ${nextOrder}`, nextOrder, Number(researchId));

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
        if (sectionId.length > 10 && sectionId.includes("-")) return;
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
        const message = sections.length === 1
            ? "Atenção: Esta é a única seção da pesquisa. Se você excluí-la, o questionário ficará vazio. Deseja continuar?"
            : "Tem certeza que deseja excluir esta seção e todas as suas questões?";

        if (!confirm(message)) return;

        try {
            await deleteSectionApi(Number(sectionId));
            setSections(prev => prev.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i + 1 })));
            toast.success("Seção excluída com sucesso!");
        } catch (e: any) {
            const backendMsg = e?.message || "";
            toast.error(backendMsg.includes("answers") ? "Não é possível excluir: contém questões já respondidas." : "Erro ao excluir seção.");
        }
    };

    // ================= QUESTÕES =================
    const handleTypeChange = async (sectionId: string, questionId: string, newType: FrontendQuestionType) => {
        const section = sections.find(s => s.id === sectionId);
        const question = section?.questions.find(q => q.id === questionId);

        if (question && question.type !== newType) {
            const confirmed = confirm("Aviso: Mudar o tipo desta questão pode fazer com que configurações ou respostas anteriores sejam perdidas. Deseja continuar?");
            if (!confirmed) return;
        }

        updateLocalQuestionState(sectionId, questionId, "type", newType);

        const isMultiple = newType === "multiple-choice";
        const extraPayload: any = { type: toBackendType(newType) };

        if (isMultiple && question && !question.minSelections) {
            extraPayload.minSelections = 1;
            extraPayload.maxSelections = 2;
            updateLocalQuestionState(sectionId, questionId, "minSelections", 1);
            updateLocalQuestionState(sectionId, questionId, "maxSelections", 2);
        }

        if (questionId.length > 10 && questionId.includes("-")) return;

        try {
            await updateQuestionApi(Number(questionId), extraPayload);
            toast.success("Tipo de questão atualizado!", { id: "q-save", duration: 1000 });

            if (hasOptions(newType) && (!question?.options || question.options.length === 0)) {
                await handleAddOption(sectionId, questionId);
            }
        } catch (e) {
            toast.error("Erro ao alterar o tipo da questão.");
        }
    };

    const handleBlurQuestionField = async (sectionId: string, questionId: string, field: string, value: any) => {
        if (questionId.length > 10 && questionId.includes("-")) return;

        const section = sections.find(s => s.id === sectionId);
        const question = section?.questions.find(q => q.id === questionId);

        if (question) {
            if (question.type === "multiple-choice") {
                const currentMin = field === "minSelections" ? value : (question.minSelections || 1);
                const currentMax = field === "maxSelections" ? value : (question.maxSelections || 1);
                if (currentMax < currentMin) {
                    toast.error("O limite máximo não pode ser menor que o mínimo.");
                    updateLocalQuestionState(sectionId, questionId, field as keyof FormQuestion, field === "minSelections" ? 1 : Math.max(2, currentMin));
                    return;
                }
            }
            if (question.type === "number") {
                const currentMin = field === "minValue" ? value : question.minValue;
                const currentMax = field === "maxValue" ? value : question.maxValue;
                if (currentMin != null && currentMax != null && currentMax < currentMin) {
                    toast.error("O valor máximo não pode ser menor que o mínimo.");
                    updateLocalQuestionState(sectionId, questionId, field as keyof FormQuestion, undefined);
                    return;
                }
            }
            if (question.type === "date") {
                const currentMin = field === "minDate" ? value : question.minDate;
                const currentMax = field === "maxDate" ? value : question.maxDate;
                if (currentMin && currentMax && new Date(currentMax) < new Date(currentMin)) {
                    toast.error("A data máxima não pode ser anterior à mínima.");
                    updateLocalQuestionState(sectionId, questionId, field as keyof FormQuestion, undefined);
                    return;
                }
            }
        }

        try {
            const payload: any = {};
            const backendField = field === "title" ? "statement" : field;
            payload[backendField] = field === "type" ? toBackendType(value) : value;

            await updateQuestionApi(Number(questionId), payload);
            toast.success("Configuração salva!", { id: "q-save", duration: 1000 });
        } catch (e) {
            toast.error("Erro ao salvar alteração na questão.");
        }
    };

    const updateLocalQuestionState = (sectionId: string, questionId: string, field: keyof FormQuestion, value: any) => {
        setSections(prev => prev.map(s => s.id === sectionId ? {
            ...s, questions: s.questions.map(q => q.id === questionId ? { ...q, [field]: value } : q)
        } : s));
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
        if (confirm("Deseja excluir esta questão?")) {
            try {
                await deleteQuestionApi(Number(questionId));
                setSections(prev => prev.map(s => s.id === sectionId ? {
                    ...s, questions: s.questions.filter(q => q.id !== questionId).map((q, i) => ({ ...q, order: i + 1 }))
                } : s));
                toast.success("Questão excluída com sucesso!");
            } catch (e: any) {
                const backendMsg = e?.message || "";
                toast.error(backendMsg.includes("answers") ? "Não é possível excluir: já foi respondida." : "Erro ao excluir questão.");
            }
        }
    };

    // ================= OPÇÕES =================
    const handleAddOption = async (sectionId: string, questionId: string) => {
        const section = sections.find(s => s.id === sectionId);
        const question = section?.questions.find(q => q.id === questionId);
        const maxOrder = question?.options?.reduce((max, o) => Math.max(max, o.order || 0), 0) ?? 0;
        const nextOrder = maxOrder + 1;

        try {
            const newOpt = await createOptionApi(Number(questionId), `Opção ${nextOrder}`, nextOrder);
            setSections(prev => prev.map(s => s.id === sectionId ? {
                ...s, questions: s.questions.map(q => q.id === questionId ? {
                    ...q, options: [...(q.options || []), { id: String(newOpt.id), text: newOpt.text, order: newOpt.order }]
                } : q)
            } : s));
            toast.success("Opção adicionada!", { id: 'opt-add', duration: 1000 });
        } catch (e) {
            toast.error("Erro ao adicionar opção.");
        }
    }

    const handleBlurOptionText = async (optionId: string, text: string) => {
        try {
            await updateOptionApi(Number(optionId), { text });
            toast.success("Opção salva!", { id: "opt-save", duration: 1000 });
        } catch (e) {
            toast.error("Erro ao salvar opção.");
        }
    }

    const handleUpdateOptionLocal = (sectionId: string, questionId: string, optionId: string, text: string) => {
        setSections(prev => prev.map(s => s.id === sectionId ? {
            ...s, questions: s.questions.map(q => q.id === questionId ? {
                ...q, options: q.options?.map(o => o.id === optionId ? { ...o, text } : o)
            } : q)
        } : s));
    }

    const handleDeleteOption = async (sectionId: string, questionId: string, optionId: string) => {
        const section = sections.find(s => s.id === sectionId);
        const question = section?.questions.find(q => q.id === questionId);

        if (question && question.options && question.options.length <= 1) {
            toast.error("A questão precisa ter pelo menos uma opção.");
            return;
        }

        try {
            await deleteOptionApi(Number(optionId));
            setSections(prev => prev.map(s => s.id === sectionId ? {
                ...s, questions: s.questions.map(q => q.id === questionId ? {
                    ...q, options: q.options?.filter(o => o.id !== optionId)
                } : q)
            } : s));
            toast.success("Opção excluída!");
        } catch (e) {
            toast.error("Erro ao excluir opção.");
        }
    }

    const moveOption = async (sectionId: string, questionId: string, optIndex: number, direction: "up" | "down") => {
        const section = sections.find(s => s.id === sectionId);
        const question = section?.questions.find(q => q.id === questionId);
        if (!question || !question.options) return;

        const targetIndex = direction === "up" ? optIndex - 1 : optIndex + 1;
        if (targetIndex < 0 || targetIndex >= question.options.length) return;

        const updatedOptions = [...question.options];
        const [moved] = updatedOptions.splice(optIndex, 1);
        updatedOptions.splice(targetIndex, 0, moved);

        try {
            for (let i = 0; i < updatedOptions.length; i++) {
                const opt = updatedOptions[i];
                await updateOptionApi(Number(opt.id), { order: i + 1 });
            }
            setSections(prev => prev.map(s => s.id === sectionId ? {
                ...s, questions: s.questions.map(q => q.id === questionId ? {
                    ...q, options: updatedOptions.map((o, i) => ({ ...o, order: i + 1 }))
                } : q)
            } : s));
            toast.success("Ordem atualizada!", { id: "opt-order", duration: 1000 });
        } catch (e) {
            toast.error("Erro ao reordenar opções.");
        }
    }

    // ==== PACOTE DE AÇÕES ====
    const qActions: QuestionActions = {
        handleTypeChange,
        handleBlurQuestionField,
        updateLocalQuestionState,
        moveQuestion,
        handleDeleteQuestion
    };

    const optActions: OptionActions = {
        handleAddOption,
        handleBlurOptionText,
        handleUpdateOptionLocal,
        handleDeleteOption,
        moveOption
    };

    if (isLoading) return <div className="p-8 text-center flex gap-2 justify-center text-muted-foreground"><Spinner /> Carregando Questões...</div>;

    if (sections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border rounded-md">
                <p className="text-sm text-muted-foreground">Esta pesquisa ainda não tem nenhuma seção ou questão.</p>
                <Button variant="outline" size="sm" onClick={handleAddSection}>
                    <FolderPlus className="w-4 h-4 mr-1.5" /> Criar Primeira Seção
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card sticky top-0 z-10 pb-3 border-b gap-4 border p-2 rounded-t-none rounded-xl shadow">
                <p className="text-xs text-muted-foreground">As alterações salvam ao sair do campo (blur). Ordenação e exclusão são instantâneas.</p>
                <Button size="sm" onClick={handleAddSection}>
                    <FolderPlus className="w-4 h-4 mr-1.5" /> Adicionar Seção
                </Button>
            </div>

            {sections.map((section, sIndex) => (
                <SectionCard
                    key={section.id}
                    section={section}
                    sIndex={sIndex}
                    totalSections={sections.length}
                    onBlurTitle={handleBlurSectionTitle}
                    onMove={moveSection}
                    onDelete={handleDeleteSection}
                    onAddQuestion={handleAddQuestionToSection}
                    qActions={qActions}
                    optActions={optActions}
                />
            ))}
            <div className="h-100 w-full flex-shrink-0" aria-hidden="true" />
        </div>
    );
}