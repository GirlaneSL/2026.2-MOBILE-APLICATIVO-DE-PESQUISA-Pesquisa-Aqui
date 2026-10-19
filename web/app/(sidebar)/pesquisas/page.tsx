'use client'

import { useState } from "react";
import { NotebookPen, Plus } from "lucide-react";
import BannerComponent from "@/components/ui/bannerComponent";
import DialogLayout from "@/components/ui/dialogLayout";
import InfoCard from "../(home)/components/infoCards";
import CadastrarPesquisaForm from "./components/CadastrarPesquisaForm";
import TabelaPesquisas from "./components/TabelaPesquisas";

export default function Pesquisas() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const forceRefresh = () => setRefreshTrigger((prev) => prev + 1);

    return (
        <section className="flex flex-col gap-5">
            <BannerComponent
                title="Pesquisas"
                description="Monte questionários, publique para o campo e acompanhe cada pesquisa."
                actions={
                    <DialogLayout
                        triggerButtonSize="sm"
                        dialogTrigger={<><Plus />Nova pesquisa</>}
                        dialogTitle="Nova pesquisa"
                        dialogDescription="Informe os dados principais. As questões entram na próxima etapa."
                        dialogContent={<CadastrarPesquisaForm onSuccess={forceRefresh} />}
                    />
                }
            />

            <InfoCard
                animationDelayN={2}
                icon={<NotebookPen />}
                cardTitle="Todas as pesquisas"
                cardDescription="Abra uma pesquisa para ver as questões, a equipe e as coletas."
                cardContent={
                    <TabelaPesquisas refreshTrigger={refreshTrigger} onChange={forceRefresh} />
                }
            />
        </section>
    )
}
