'use client'

import { useEffect, useState } from "react";
import { loadQuestionnaire} from "@/lib/questionnaire";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { Question } from "./MontarPesquisaForm";

export default function ListarQuestoesSalvas({ researchId }: { researchId: string | number }) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadQuestionnaire(Number(researchId))
            .then(setQuestions)
            .catch(() => toast.error("Erro ao carregar questões salvas."))
            .finally(() => setIsLoading(false));
    }, [researchId]);

    if (isLoading) return <div className="p-8 text-center flex justify-center"><Spinner /></div>;
    
    if (questions.length === 0) {
        return <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">Nenhuma questão cadastrada para esta pesquisa.</p>;
    }

    // Agrupa as questões por Seção para exibição organizada
    const groupedBySection = questions.reduce((acc, q) => {
        const sectionName = q.section || "Geral";
        if (!acc[sectionName]) acc[sectionName] = [];
        acc[sectionName].push(q);
        return acc;
    }, {} as Record<string, Question[]>);

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {Object.entries(groupedBySection).map(([sectionName, sectionQuestions]) => (
                <div key={sectionName} className="space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">{sectionName}</h3>
                    </div>

                    <div className="space-y-3 pl-2">
                        {sectionQuestions.map((q) => (
                            <Card key={q.id}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">#{q.order}</span>
                                        <span>{q.title}</span>
                                    </CardTitle>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => toast("Edição individual em breve!")}>
                                            <Edit className="w-4 h-4 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => toast("Exclusão individual em breve!")}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    {q.helpText && <p className="text-xs text-muted-foreground">Ajuda: {q.helpText}</p>}
                                    <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                                        <span><strong>Tipo:</strong> {q.type}</span>
                                        <span><strong>Obrigatória:</strong> {q.required ? "Sim" : "Não"}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}