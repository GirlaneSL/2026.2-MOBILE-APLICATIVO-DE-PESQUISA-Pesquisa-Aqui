'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import toast from 'react-hot-toast';

export interface RawCompany {
    id: number;
    legalName: string;
    contactInformation: string;
    situation: 'ACTIVE' | 'INACTIVE';
}

interface FormEditarEmpresaProps {
    company: RawCompany;
    onSuccess: (updated: RawCompany) => void;
}

export default function FormEditarEmpresa({ company, onSuccess }: FormEditarEmpresaProps) {
    const [legalName, setLegalName] = useState(company.legalName || '');
    const [contactInformation, setContactInformation] = useState(company.contactInformation || '');
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setIsLoading(true);
        setSubmitError(null);

        const payload = {
            legalName,
            contactInformation,
        };

        try {
            const response = await fetch(`http://localhost:3001/company/${company.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(
                    Array.isArray(errorData?.message)
                        ? errorData.message.join(', ')
                        : errorData?.message || 'Falha ao atualizar a empresa.'
                );
            }

            const savedItem = await response.json();
            onSuccess(savedItem);
            toast.success('Empresa editada com sucesso!');
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
                <label className="text-sm font-medium" htmlFor={`legalName-${company.id}`}>
                    Razão Legal*
                </label>
                <Input
                    required
                    id={`legalName-${company.id}`}
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    disabled={isLoading}
                />
            </div>

            <div>
                <label className="text-sm font-medium" htmlFor={`contact-${company.id}`}>
                    Contato*
                </label>
                <Input
                    required
                    id={`contact-${company.id}`}
                    value={contactInformation}
                    onChange={(e) => setContactInformation(e.target.value)}
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