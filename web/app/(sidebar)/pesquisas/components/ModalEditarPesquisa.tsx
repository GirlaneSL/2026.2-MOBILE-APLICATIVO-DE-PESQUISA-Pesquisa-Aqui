'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import FormEditarDadosPesquisa from './FormEditarDadosPesquisa';
import ListarQuestoesSalvas from './ListarQuestoesSalvas/ListarQuestoesSalvas';
import { Research } from './TabelaPesquisas';

interface ModalEditarPesquisaProps {
    research: Research;
    onSuccess: (updated: Research) => void;
    isMontagem?: boolean;
    isPesquisa?: boolean;

}


export default function ModalEditarPesquisa({ research, onSuccess, isMontagem = true, isPesquisa = true }: ModalEditarPesquisaProps) {
    return (
        <Tabs defaultValue="info" className="w-full ">
            <TabsList
                className={cn(
                    "relative grid w-fit gap-2 grid-cols-2",
                    (isPesquisa !== isMontagem) && "grid-cols-1"
                )}
            >
                {isPesquisa && (
                    <TabsTrigger value="info">
                        Dados da Pesquisa
                    </TabsTrigger>
                )}
                {isMontagem && (
                    <TabsTrigger value="questions">
                        Montagem da Pesquisa
                    </TabsTrigger>
                )}
            </TabsList>
            {isPesquisa && (
                <TabsContent value="info" className="mt-4">
                    <FormEditarDadosPesquisa
                        research={research}
                        onSuccess={onSuccess}
                    />
                </TabsContent>
            )}
            {isMontagem && (
                <TabsContent value="questions" className="mt-4">
                    <div className="w-full">
                        <ListarQuestoesSalvas researchId={research.id} />
                    </div>
                </TabsContent>
            )}
        </Tabs>
    );
}