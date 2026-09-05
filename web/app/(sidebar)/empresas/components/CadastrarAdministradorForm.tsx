'use client'

import { Button } from "@/components/ui/button";
import { ComboBoxLayout } from "@/components/ui/comboboxLayout";
import { Input } from "@/components/ui/input";
import { getCompanies } from "@/lib/company";
import { createUser } from "@/lib/user";
import { SubmitEventHandler, useEffect, useState } from "react";

interface Company {
    id: number;
    legalName: string;
}

export default function CadastrarAdministradorForm() {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [companies, setCompanies] = useState<Company[]>([])
    const [companyId, setCompanyId] = useState<string>('')

    useEffect(() => {
        getCompanies()
            .then(setCompanies)
            .catch((error) => {
                console.log(error);
                alert("Erro ao carregar empresas");

            });
    }, []);

    const sortedCompanies = [...companies].sort((a, b) => a.legalName.localeCompare(b.legalName, 'pt-BR', { sensitivity: 'base' }))

    const companyIds = sortedCompanies.map((c) => String(c.id));
    const companyLabels: Record<string, string> = sortedCompanies.reduce(
        (acc, c) => ({ ...acc, [String(c.id)]: c.legalName }),
        {}
    );

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        if (!companyId) {
            alert("Selecione uma empresa");
            return;
        }

        if (password !== confirmPassword) {
            alert("As senhas não coincidem");
            return;
        }

        try {
            await createUser(name, username, password, 'ADMINISTRATOR', Number(companyId))
            alert("Administrador cadastrado com sucesso!");

            setName('');
            setUsername('');
            setPassword('');
            setConfirmPassword('');
            setCompanyId('');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Erro ao cadastrar administrador");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
                <div>
                    <label htmlFor="admin-name">Nome*</label>
                    <Input
                        required
                        id="admin-name"
                        placeholder="João"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="admin-name">Username*</label>
                    <Input
                        required
                        id="admin-username"
                        placeholder="João.admin"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="admin-password">Senha*</label>
                    <Input
                        type="password"
                        required
                        id="admin-password"
                        placeholder="123456"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="admin-cpassword">Confirmar Senha*</label>
                    <Input
                        type="password"
                        required
                        id="admin-cpassword"
                        placeholder="123456"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="admin-empresa">Empresa*</label>
                    <ComboBoxLayout
                        items={companyIds}
                        labels={companyLabels}
                        value={companyId}
                        onValueChange={setCompanyId}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" className="w-fit verde">
                        Cadastrar Administrador
                    </Button>
                </div>
            </div>
        </form>
    );
}