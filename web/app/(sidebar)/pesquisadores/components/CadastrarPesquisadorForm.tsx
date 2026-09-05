'use client'

import { Button } from "@/components/ui/button";
import { ComboBoxLayout } from "@/components/ui/comboboxLayout";
import { Input } from "@/components/ui/input";
import { SubmitEventHandler, useState } from "react";

export default function CadastrarPesquisadorForm() {
    // Estados do formulário extraídos do componente principal
    const [Nome, setNome] = useState('');
    const [Usuario, setUsuario] = useState('');
    const [Empresa, setEmpresa] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        if (!Empresa) {
            alert("Selecione uma situação");
            return;
        }

        try {
            // Lógica de submissão
        } catch (error) {
            // Lógica de erro
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
                        value={Nome}
                        onChange={(e) => setNome(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="user">Usuario*</label>
                    <Input
                        required
                        id="user"
                        placeholder="Joãozinho"
                        value={Usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="perfil">Perfil*</label>
                    <Input
                        required
                        id="perfil"
                        placeholder="Perfil"
                        value={Usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="password">Senha*</label>
                    <Input
                        required
                        id="password"
                        placeholder="123456"
                        value={Usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="situation">Empresa que Pertence*</label>
                    <ComboBoxLayout
                        value={Empresa}
                        onValueChange={setEmpresa}
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