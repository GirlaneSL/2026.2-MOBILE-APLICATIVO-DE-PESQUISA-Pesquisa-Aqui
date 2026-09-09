'use client';

import toast from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Research } from './TabelaPesquisas';
import FormEditarDadosPesquisa from './FormEditarDadosPesquisa';
import MontarPesquisaForm from './MontarPesquisaForm';

interface ModalEditarPesquisaProps {
    research: Research;
    onSuccess: (updated: Research) => void;
}

export default function ModalEditarPesquisa({ research, onSuccess }: ModalEditarPesquisaProps) {
    return (
        <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-fit gap-2 grid-cols-2">
                <TabsTrigger value="info">
                    Dados da Pesquisa
                </TabsTrigger>
                <TabsTrigger value="questions">
                    Montagem da Pesquisa
                </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
                <FormEditarDadosPesquisa
                    research={research}
                    onSuccess={onSuccess}
                />
            </TabsContent>

            <TabsContent value="questions" className="mt-4">
                <div className="w-full">
                    <MontarPesquisaForm
                        researchId={research.id}
                        initialQuestions={research.questions}
                        onSuccess={() => toast.success('Perguntas salvas com sucesso!')}
                    />
                </div>
            </TabsContent>
        </Tabs>
    );
}