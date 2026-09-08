'use client'

import { useEffect, useState } from "react";
import { loadQuestionnaire, type FormSection } from "@/lib/questionnaire";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Layers } from "lucide-react";
import toast from "react-hot-toast";

export default function ListarQuestoesSalvas({ researchId }: { researchId: string | number }) {
    const [sections, setSections] = useState<FormSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadQuestionnaire(Number(researchId))
            .then(setSections)
            .catch(() => toast.error("Erro ao carregar questionário salvo."))
            .finally(() => setIsLoading(false));
    }, [researchId]);

    if (isLoading) return <div className="p-8 text-center flex justify-center"><Spinner /></div>;
    
    if (sections.length === 0) {
        return <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">Nenhuma questão cadastrada para esta pesquisa.</p>;
    }

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 pb-6">
            {sections.map((section) => (
                <div key={section.id} className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-base text-foreground uppercase tracking-wider">
                                {section.order}. {section.title}
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                        {section.questions.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic pl-4">Esta seção está vazia.</p>
                        ) : (
                            section.questions.map((q) => (
                                <Card key={q.id}>
                                    <CardHeader className="flex flex-row items-center justify-between py-3 bg-muted/30">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">
                                                Q{q.order}
                                            </span>
                                            <span>{q.title}</span>
                                        </CardTitle>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast("Edição individual em breve!")}>
                                                <Edit className="w-3.5 h-3.5 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast("Exclusão individual em breve!")}>
                                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-1 py-3">
                                        {q.helpText && <p className="text-xs text-muted-foreground mb-2">Ajuda: {q.helpText}</p>}
                                        <div className="flex gap-4 text-xs font-medium text-foreground pt-1">
                                            <span>Tipo: <span className="text-muted-foreground font-normal">{q.type}</span></span>
                                            <span>Obrigatória: <span className="text-muted-foreground font-normal">{q.required ? "Sim" : "Não"}</span></span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}