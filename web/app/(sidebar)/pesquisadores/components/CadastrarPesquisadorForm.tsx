'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUser } from "@/lib/user";
import { SubmitEventHandler, useState } from "react";

export default function CadastrarPesquisadorForm() {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("As senhas não coincidem");
            return;
        }

        try {
            await createUser(name, username, password, 'RESEARCHER');
            alert("Pesquisador cadastrado com sucesso!");

            setName('');
            setUsername('');
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Erro ao cadastrar pesquisador");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
                <div>
                    <label htmlFor="name">Nome*</label>
                    <Input
                        required
                        id="name"
                        placeholder="João"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="user">Usuario*</label>
                    <Input
                        required
                        id="user"
                        placeholder="Joãozinho"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="password">Senha*</label>
                    <Input
                        type="password"
                        required
                        id="password"
                        placeholder="123456"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword">Confirmar Senha*</label>
                    <Input
                        type="password"
                        required
                        id="confirmPassword"
                        placeholder="123456"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" className="w-fit verde">
                        Cadastrar Pesquisador
                    </Button>
                </div>
            </div>
        </form>
    );
}