'use client'

import { Button } from "@/components/ui/button";
import { ComboBoxLayout } from "@/components/ui/comboboxLayout";
import { Input } from "@/components/ui/input";
import { createCompany } from "@/lib/company";
import { SubmitEventHandler, useState } from "react";

export default function CadastrarEmpresaForm() {
    const [legalName, setLegalName] = useState('');
    const [contact, setContact] = useState('');
    const [situation, setSituation] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        if (!situation) {
            alert("Selecione uma situação");
            return;
        }

        try {
            await createCompany(legalName, contact, situation);
            alert("Empresa cadastrada com sucesso!");

            setLegalName('');
            setContact('');
            setSituation('');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Erro ao cadastrar empresa");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
                <div>
                    <label htmlFor="company-name">Nome da Empresa*</label>
                    <Input
                        required
                        id="company-name"
                        placeholder="Razão Social"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="company-contact">Contato*</label>
                    <Input
                        required
                        id="company-contact"
                        placeholder="+00 00 0000-0000"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="company-situation">Situação*</label>
                    <ComboBoxLayout
                        value={situation}
                        onValueChange={setSituation}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" className="w-fit verde">
                        Cadastrar Empresa
                    </Button>
                </div>
            </div>
        </form>
    );
}