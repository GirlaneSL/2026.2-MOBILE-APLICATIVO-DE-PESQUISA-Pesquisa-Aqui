'use client'

import { Button } from "@/components/ui/button";
import { ComboBoxLayout } from "@/components/ui/comboboxLayout";
import { Input } from "@/components/ui/input";
import { SubmitEventHandler, useState } from "react";

export default function CadastrarAdministradorForm() {
    const [nome, setNome] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [empresa, setEmpresa] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        if (!empresa) {
            alert("Selecione uma empresa");
            return;
        }

        try {
            // Lógica de cadastro do administrador
            alert("Administrador cadastrado com sucesso!");
        } catch (error) {
            console.error(error);
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
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="admin-password">Senha*</label>
                    <Input
                        type="password"
                        required
                        id="admin-password"
                        placeholder="123456"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="admin-cpassword">Confirmar Senha*</label>
                    <Input
                        type="password"
                        required
                        id="admin-cpassword"
                        placeholder="123456"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="admin-empresa">Empresa*</label>
                    <ComboBoxLayout
                        value={empresa}
                        onValueChange={setEmpresa}
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