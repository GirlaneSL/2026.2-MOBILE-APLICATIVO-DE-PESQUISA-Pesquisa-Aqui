'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Research } from './TabelaPesquisas';
import FormEditarDadosPesquisa from './FormEditarDadosPesquisa';
import MontarPesquisaForm from './MontarPesquisaForm';


interface ModalEditarPesquisaProps {
    research: Research;
    onSuccess: (updated: Research) => void;
}

export default function ModalEditarPesquisa({ research, onSuccess }: ModalEditarPesquisaProps) {
    const [editTab, setEditTab] = useState<'info' | 'questions'>('info');

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b pb-2">
                <Button
                    type="button"
                    variant={editTab === 'info' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditTab('info')}
                >
                    Dados da Pesquisa
                </Button>
                <Button
                    type="button"
                    variant={editTab === 'questions' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditTab('questions')}
                >
                    Montagem da Pesquisa
                </Button>
            </div>

            {editTab === 'info' && (
                <FormEditarDadosPesquisa
                    research={research}
                    onSuccess={onSuccess}
                />
            )}

            {editTab === 'questions' && (
                <div className="w-full">
                    <MontarPesquisaForm
                        researchId={research.id}
                        initialQuestions={research.questions}
                        onSuccess={() => toast.success('Perguntas salvas com sucesso!')}
                    />
                </div>
            )}
        </div>
    );
}