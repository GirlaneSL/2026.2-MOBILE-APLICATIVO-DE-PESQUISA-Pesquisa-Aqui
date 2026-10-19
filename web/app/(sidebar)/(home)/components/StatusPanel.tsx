import type { ReactNode } from "react";
import InfoCard from "./infoCards";

export type StatusRow = { label: string; count: number; tone?: "green" | "clay" };

type StatusPanelProps = {
    title: string;
    description?: string;
    icon?: ReactNode;
    /** Quantas unidades estão na situação destacada. */
    highlighted: number;
    total: number;
    /** O que o medidor mostra, abaixo do percentual. Ex.: "pesquisas ativas". */
    caption: string;
    rows: StatusRow[];
    cardClassName?: string;
};

/** Painel menta com medidor de marcas e a divisão por situação. */
export default function StatusPanel({ title, description, icon, highlighted, total, caption, rows, cardClassName }: StatusPanelProps) {
    const pct = total > 0 ? Math.round((highlighted / total) * 100) : 0;
    const ticks = 60;

    return (
        <InfoCard
            tone="mint"
            cardClassName={cardClassName}
            icon={icon}
            cardTitle={title}
            cardDescription={description}
            contour={{ seed: 5.5, rings: 9, cx: 1.0, cy: 0.05, size: 1.2, width: 400, height: 560 }}
            cardContent={
                <>
                    <div className="pa-gauge" role="img" aria-label={`${pct}% ${caption}`}>
                        <svg viewBox="0 0 200 200" aria-hidden="true">
                            {Array.from({ length: ticks }).map((_, i) => {
                                const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
                                const r1 = 74;
                                const r2 = i % 5 === 0 ? 94 : 88;
                                return (
                                    <line
                                        key={i}
                                        x1={(100 + r1 * Math.cos(a)).toFixed(2)}
                                        y1={(100 + r1 * Math.sin(a)).toFixed(2)}
                                        x2={(100 + r2 * Math.cos(a)).toFixed(2)}
                                        y2={(100 + r2 * Math.sin(a)).toFixed(2)}
                                        stroke={i / ticks < pct / 100 ? "#2e5546" : "rgba(46,85,70,.2)"}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                );
                            })}
                        </svg>
                        <div className="v"><b>{pct}%</b><span>{caption}</span></div>
                    </div>
                    <div className="pa-mrows">
                        {rows.map((row) => {
                            const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
                            return (
                                <div className="pa-mrow" key={row.label}>
                                    <div className="n"><b>{row.label}</b><span>{row.count} de {total}</span></div>
                                    <div className="meter" aria-hidden="true"><i className={row.tone === "clay" ? "clay" : ""} style={{ width: `${share}%` }} /></div>
                                    <em>{share}%</em>
                                </div>
                            );
                        })}
                    </div>
                </>
            }
        />
    );
}
