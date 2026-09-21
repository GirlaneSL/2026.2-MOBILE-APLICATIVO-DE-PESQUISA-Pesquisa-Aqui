import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { FormQuestion, FrontendQuestionType } from "@/lib/questionnaire";

export const QUESTION_TYPES_LABEL: { type: FrontendQuestionType; label: string }[] = [
    { type: "text", label: "Texto Livre" }, { type: "number", label: "Numérica" },
    { type: "date", label: "Data" }, { type: "time", label: "Hora" },
    { type: "boolean", label: "Sim / Não" }, { type: "single-choice", label: "Escolha Única" },
    { type: "multiple-choice", label: "Múltipla Escolha" }, { type: "rating-1-5", label: "Escala de 1 a 5" },
    { type: "photo", label: "Foto" }, { type: "multiple-photos", label: "Várias Fotos" },
    { type: "location", label: "Localização" }, { type: "audio", label: "Áudio" },
];

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
}

export function QuestionCard({ sectionId, q, qIndex, totalQuestions, qActions, optActions }: QuestionCardProps) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-2.5 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">Q{q.order}</span>
                </CardTitle>
                <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => qActions.moveQuestion(sectionId, qIndex, "up")} disabled={qIndex === 0}><ArrowUp className="w-3.5 h-3.5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => qActions.moveQuestion(sectionId, qIndex, "down")} disabled={qIndex === totalQuestions - 1}><ArrowDown className="w-3.5 h-3.5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => qActions.handleDeleteQuestion(sectionId, q.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
                <div className="space-y-1">
                    <Label className="text-xs">Enunciado</Label>
                    <Input
                        value={q.title || ''}
                        onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "title", e.target.value)}
                        onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "title", e.target.value)}
                        placeholder="Enunciado da pergunta"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Texto de Ajuda</Label>
                    <Input
                        value={q.helpText || ''}
                        onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "helpText", e.target.value)}
                        onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "helpText", e.target.value)}
                        placeholder="Opcional"
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-1">
                    <div className="space-y-1 flex-1 w-full">
                        <Label className="text-xs">Tipo de Resposta</Label>
                        <Select value={q.type} onValueChange={(val) => qActions.handleTypeChange(sectionId, q.id, val as FrontendQuestionType)}>
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
                                qActions.updateLocalQuestionState(sectionId, q.id, "required", c);
                                qActions.handleBlurQuestionField(sectionId, q.id, "isRequired", c);
                            }}
                        />
                        <Label className="cursor-pointer text-xs">Obrigatória</Label>
                    </div>
                </div>

                {/* Configurações específicas baseadas no tipo de questão */}
                {q.type === 'text' && (
                    <div className="flex items-center gap-4 mt-2 p-3 bg-muted/20 border rounded-lg">
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Limite de Caracteres (Opcional)</Label>
                            <Input
                                type="number"
                                min="1"
                                value={q.maxLength || ''}
                                onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "maxLength", e.target.value === '' ? undefined : parseInt(e.target.value))}
                                onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "maxLength", e.target.value === '' ? null : parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                )}

                {q.type === 'rating-1-5' && (
                    <div className="flex items-center gap-4 mt-2 p-3 bg-muted/20 border rounded-lg">
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Rótulo Esquerdo (Menor valor)</Label>
                            <Input
                                type="text"
                                placeholder="Ex: Muito Ruim"
                                value={q.scaleLeftLabel || ''}
                                onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "scaleLeftLabel", e.target.value)}
                                onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "scaleLeftLabel", e.target.value === '' ? null : e.target.value)}
                            />
                        </div>
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Rótulo Direito (Maior valor)</Label>
                            <Input
                                type="text"
                                placeholder="Ex: Muito Bom"
                                value={q.scaleRightLabel || ''}
                                onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "scaleRightLabel", e.target.value)}
                                onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "scaleRightLabel", e.target.value === '' ? null : e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {q.type === 'multiple-choice' && (
                    <div className="flex items-center gap-4 mt-2 p-3 bg-muted/20 border rounded-lg">
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Mínimo de Escolhas</Label>
                            <Input type="number" min="1" value={q.minSelections || 1} onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "minSelections", parseInt(e.target.value) || 1)} onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "minSelections", parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Máximo de Escolhas</Label>
                            <Input type="number" min="1" value={q.maxSelections || 2} onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "maxSelections", parseInt(e.target.value) || 2)} onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "maxSelections", parseInt(e.target.value) || 2)} />
                        </div>
                    </div>
                )}

                {q.type === 'number' && (
                    <div className="flex items-center gap-4 mt-2 p-3 bg-muted/20 border rounded-lg">
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Valor Mínimo (Opcional)</Label>
                            <Input type="number" value={q.minValue ?? ''} onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "minValue", e.target.value === '' ? undefined : parseInt(e.target.value))} onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "minValue", e.target.value === '' ? null : parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Valor Máximo (Opcional)</Label>
                            <Input type="number" value={q.maxValue ?? ''} onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "maxValue", e.target.value === '' ? undefined : parseInt(e.target.value))} onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "maxValue", e.target.value === '' ? null : parseInt(e.target.value))} />
                        </div>
                    </div>
                )}

                {q.type === 'date' && (
                    <div className="flex items-center gap-4 mt-2 p-3 bg-muted/20 border rounded-lg">
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">A Partir da Data (Opcional)</Label>
                            <Input type="date" value={q.minDate || ''} onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "minDate", e.target.value)} onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "minDate", e.target.value === '' ? null : e.target.value)} />
                        </div>
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Até a Data (Opcional)</Label>
                            <Input type="date" value={q.maxDate || ''} onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "maxDate", e.target.value)} onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "maxDate", e.target.value === '' ? null : e.target.value)} />
                        </div>
                    </div>
                )}

                {q.type === 'multiple-photos' && (
                    <div className="flex items-center gap-4 mt-2 p-3 bg-muted/20 border rounded-lg">
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Quantidade Máxima de Fotos (Opcional)</Label>
                            <Input
                                type="number"
                                min="2"
                                value={q.maxFiles || ''}
                                onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "maxFiles", e.target.value === '' ? undefined : parseInt(e.target.value))}
                                onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "maxFiles", e.target.value === '' ? null : parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                )}

                {q.type === 'audio' && (
                    <div className="flex items-center gap-4 mt-2 p-3 bg-muted/20 border rounded-lg">
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">Duração Máxima (em segundos)</Label>
                            <Input
                                type="number"
                                min="1"
                                placeholder="Ex: 60"
                                value={q.maxDuration || ''}
                                onChange={(e) => qActions.updateLocalQuestionState(sectionId, q.id, "maxDuration", e.target.value === '' ? undefined : parseInt(e.target.value))}
                                onBlur={(e) => qActions.handleBlurQuestionField(sectionId, q.id, "maxDuration", e.target.value === '' ? null : parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                )}

                {/* Bloco de Opções */}
                {hasOptions(q.type) && (
                    <div className="p-3 bg-muted/40 border rounded-lg space-y-3 mt-3">
                        <Label className="text-xs font-semibold text-foreground">Opções de Resposta</Label>
                        <div className="space-y-2">
                            {q.options?.map((opt, optIndex) => (
                                <div key={opt.id} className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs font-mono w-4">{optIndex + 1}.</span>
                                    <Input
                                        className="h-8 text-sm flex-1 bg-background"
                                        value={opt.text}
                                        onChange={(e) => optActions.handleUpdateOptionLocal(sectionId, q.id, opt.id, e.target.value)}
                                        onBlur={(e) => optActions.handleBlurOptionText(opt.id, e.target.value)}
                                        placeholder={`Opção ${optIndex + 1}`}
                                        required
                                    />
                                    <div className="flex items-center gap-0.5">
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => optActions.moveOption(sectionId, q.id, optIndex, "up")} disabled={optIndex === 0}><ArrowUp className="w-3.5 h-3.5" /></Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => optActions.moveOption(sectionId, q.id, optIndex, "down")} disabled={optIndex === (q.options?.length || 0) - 1}><ArrowDown className="w-3.5 h-3.5" /></Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => optActions.handleDeleteOption(sectionId, q.id, opt.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => optActions.handleAddOption(sectionId, q.id)} className="w-full h-8 text-xs border-dashed">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Nova Opção
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}