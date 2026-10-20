import type { ReactNode } from "react";
import { Contour } from "@/components/ui/contour";

type Mini = { value: ReactNode; label: string };

type HeroPanelProps = {
    greeting: string;
    value: ReactNode;
    caption: string;
    /** Linha de comparação, por exemplo "2 a mais que em setembro". */
    delta?: string;
    minis: Mini[];
    /** Pontos de campo desenhados sobre as curvas de nível. */
    children?: ReactNode;
};

/** Abertura escura do painel: o número mais importante do período, em grande. */
export default function HeroPanel({ greeting, value, caption, delta, minis, children }: HeroPanelProps) {
    return (
        <section className="pa-hero introduction-card">
            <div className="pa-hero-l">
                <div>
                    <p className="hi">{greeting}</p>
                    <div className="big">{value}</div>
                    <p className="cap">{caption}</p>
                    {delta && (
                        <div className="delta">
                            <span className="pa-chip"><i />{delta}</span>
                        </div>
                    )}
                </div>
                <dl className="pa-minis">
                    {minis.map((mini) => (
                        <div key={mini.label}>
                            <dt>{mini.label}</dt>
                            <dd>{mini.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
            <div className="pa-hero-r">
                <div className="grid-bg" />
                <Contour seed={1.2} rings={13} cx={0.55} cy={0.5} size={1} width={600} height={420} />
                {children}
            </div>
        </section>
    );
}
