import type { ReactNode } from "react";
import { Contour } from "@/components/ui/contour";

type ContourConfig = {
    seed: number;
    rings: number;
    cx: number;
    cy: number;
    size?: number;
    width?: number;
    height?: number;
};

type InfoCardProps = {
    cardTitle?: ReactNode;
    cardDescription?: ReactNode;
    /** Controle alinhado à direita do título (botão, seletor, chip). */
    cardAction?: ReactNode;
    cardContent?: ReactNode;
    /** Ícone ao lado do título. */
    icon?: ReactNode;
    /** Claro (padrão), menta ou escuro (floresta). */
    tone?: "light" | "mint" | "dark";
    /** Curvas de nível ao fundo do painel. */
    contour?: ContourConfig;
    /** Classes do painel, por exemplo "pa-c8" ou "pa-c4" para ocupar colunas da grade. */
    cardClassName?: string;
    CardContentClassName?: string;
    animationDelayN?: number;
    /** Mostra o rodapé (precisa de cardFooter). */
    isCardFooter?: boolean;
    cardFooter?: ReactNode;
    cardFooterClassName?: string;
};

/** Painel do dashboard: cantos amplos, ícone, título e conteúdo. */
export default function InfoCard({
    cardTitle,
    cardDescription,
    cardAction,
    cardContent,
    icon,
    tone = "light",
    contour,
    cardClassName = "",
    CardContentClassName = "",
    animationDelayN = 1,
    isCardFooter = false,
    cardFooter,
    cardFooterClassName = "",
}: InfoCardProps) {
    const toneClass = tone === "light" ? "" : tone;

    return (
        <article
            style={{ animationDelay: `${animationDelayN * 120}ms` }}
            className={`pa-card introduction-card ${toneClass} ${cardClassName}`}
        >
            {contour && <Contour {...contour} style={tone === "mint" ? { opacity: 0.5 } : undefined} />}
            <header className="pa-card-h">
                {icon && <div className="pa-ic">{icon}</div>}
                <div className="grow">
                    <h3>{cardTitle}</h3>
                    {cardDescription && <p className="desc">{cardDescription}</p>}
                </div>
                {cardAction}
            </header>
            <div className={`mt-4 ${CardContentClassName}`}>{cardContent}</div>
            {isCardFooter && cardFooter && (
                <footer className={`mt-5 border-t border-border pt-4 ${cardFooterClassName}`}>{cardFooter}</footer>
            )}
        </article>
    );
}
