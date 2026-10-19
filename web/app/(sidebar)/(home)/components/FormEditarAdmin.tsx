'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import toast from 'react-hot-toast';
import { updateUser } from '@/lib/user';

// Tipagem baseada nos dados que já temos na tabela
export interface RawAdmin {
    id: string;
    name: string;
    username: string;
    profile: string;
}

interface FormEditarAdminProps {
    admin: RawAdmin;
    onSuccess: (updated: RawAdmin) => void;
}

export default function FormEditarAdmin({ admin, onSuccess }: FormEditarAdminProps) {
    const [name, setName] = useState(admin.name || '');
    const [username, setUsername] = useState(admin.username || '');
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setIsLoading(true);
        setSubmitError(null);

        const payload = {
            name,
            username,
        };

        try {
            // Chamada para a API (lib/user.ts)
            const savedItem = await updateUser(admin.id, payload);

            // Atualiza a tabela com os novos dados
            onSuccess(savedItem);
            toast.success('Administrador editado com sucesso!');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao salvar alterações.';
            setSubmitError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <div>
                <label className="text-sm font-medium" htmlFor={`name-${admin.id}`}>
                    Nome Completo*
                </label>
                <Input
                    required
                    id={`name-${admin.id}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                />
            </div>

            <div>
                <label className="text-sm font-medium" htmlFor={`username-${admin.id}`}>
                    Nome de Usuário (Login)*
                </label>
                <Input
                    required
                    id={`username-${admin.id}`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                />
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Spinner />
                            <span>Salvando...</span>
                        </div>
                    ) : (
                        <span>Salvar Alterações</span>
                    )}
                </Button>
            </div>
        </form>
    );
}