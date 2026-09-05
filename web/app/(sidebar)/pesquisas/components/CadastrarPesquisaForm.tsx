'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createResearch } from "@/lib/research";
import { SubmitEventHandler, useState } from "react";

export default function CadastrarPesquisaForm() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [objective, setObjective] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [targetAudience, setTargetAudience] = useState('');

    const datesValid = !startDate || !endDate || startDate <= endDate;

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        if (!datesValid) {
            alert("A data de término não pode ser anterior à data de início");
            return;
        }

        try {
            await createResearch(title, description, objective, startDate, endDate, targetAudience);

            alert("Pesquisa criada com sucesso!");

            setTitle('');
            setDescription('');
            setObjective('');
            setStartDate('');
            setEndDate('');
            setTargetAudience('');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Erro ao criar pesquisa");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
                <div>
                    <label htmlFor="title">Titulo*</label>
                    <Input
                        required
                        id="title"
                        placeholder="Pesquisa Exemplo"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="description">Descrição*</label>
                    <Input
                        type="text"
                        required
                        id="description"
                        placeholder="Descrição exemplo"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="Objective">Objetivo*</label>
                    <Input
                        type="text"
                        required
                        id="Objective"
                        placeholder="Objetivo exemplo"
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="startDate">Data de início*</label>
                    <Input
                        type="date"
                        required
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="endDate">Data de término*</label>
                    <Input
                        type="date"
                        required
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                {!datesValid && (
                    <p className="text-red-500 text-sm mt-1">
                        A data de término deve ser após a data de início
                    </p>
                )}
                <div>
                    <label htmlFor="publico">Público Alvo*</label>
                    <Input
                        type="text"
                        required
                        id="publico"
                        placeholder="Público Alvo Exemplo"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" className="w-fit verde">
                        Cadastrar Pesquisa
                    </Button>
                </div>
            </div>
        </form>
    );
}