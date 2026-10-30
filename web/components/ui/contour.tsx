import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type ContourProps = {
    /** Muda o formato das curvas. */
    seed?: number;
    /** Quantidade de anéis. */
    rings?: number;
    /** Centro das curvas, de 0 a 1, dentro da área. */
    cx?: number;
    cy?: number;
    /** Escala dos anéis. */
    size?: number;
    /** Tamanho do viewBox. Só precisa mudar se a proporção da área for muito diferente. */
    width?: number;
    height?: number;
    className?: string;
    style?: CSSProperties;
};

/**
 * Curvas de nível geradas por código: cada anel é um círculo deformado.
 * É a marca visual do Pesquisa Aqui (mapa topográfico de campo).
 */
export function Contour({
    seed = 1,
    rings = 10,
    cx = 0.5,
    cy = 0.5,
    size = 1,
    width = 600,
    height = 420,
    className,
    style,
}: ContourProps) {
    const base = Math.min(width, height) * 0.07 * size;
    const paths: { d: string; delay: string }[] = [];

    for (let k = 1; k <= rings; k++) {
        const r = base * k * 0.95;
        let d = "";

        for (let i = 0; i <= 120; i++) {
            const t = (i / 120) * Math.PI * 2;
            const f =
                1 +
                0.15 * Math.sin(2 * t + seed + k * 0.12) +
                0.09 * Math.sin(3 * t + seed * 1.7) +
                0.05 * Math.sin(5 * t + seed * 2.3 + k * 0.2);
            const x = width * cx + r * f * Math.cos(t) * 1.3;
            const y = height * cy + r * f * Math.sin(t) * 0.82;
            d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
        }

        paths.push({ d: `${d}Z`, delay: `${(k * 0.09).toFixed(2)}s` });
    }

    return (
        <svg
            className={cn("pa-contour", className)}
            style={style}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
        >
            {paths.map((p, i) => (
                <path key={i} pathLength={1} d={p.d} style={{ animationDelay: p.delay }} />
            ))}
        </svg>
    );
}

type PinProps = {
    label: string;
    value?: React.ReactNode;
    /** Posição dentro da área, em porcentagem. */
    left: string;
    top: string;
    /** Destaque em argila, para algo que pede atenção. */
    tone?: "mint" | "clay";
    delay?: string;
};

/** Ponto de campo com rótulo, usado sobre as curvas de nível. */
export function Pin({ label, value, left, top, tone = "mint", delay = "0s" }: PinProps) {
    return (
        <div
            className={cn("pa-pin", tone === "clay" && "clay")}
            style={{ left, top, ["--d" as string]: delay }}
        >
            <span className="dot" />
            <span className="tag">
                {label}
                {value !== undefined && <b>{value}</b>}
            </span>
        </div>
    );
}

const BRAND_COLOR = "#2D474C";
const BRAND_ACCENT = "#6B7785";

/**
 * Marca do app: pino de mapa com o gráfico de barras dentro (mesma arte de public/logo.svg e app/icon.svg).
 * Sem props usa as cores oficiais. Em fundo escuro passe só `color` (ex.: menta): as barras claras
 * viram uma versão mais suave da mesma cor. `accent` força a cor das duas barras da direita.
 */
export function BrandMark({ color = BRAND_COLOR, accent, className }: { color?: string; accent?: string; className?: string }) {
    const clipId = `pa-brand-clip-${useId().replace(/:/g, "")}`;
    const custom = color !== BRAND_COLOR;
    const barColor = accent ?? (custom ? color : BRAND_ACCENT);
    const barOpacity = accent === undefined && custom ? 0.55 : 1;

    return (
        <svg viewBox="0 0 200 200" aria-hidden="true" className={className}>
            <defs>
                <clipPath id={clipId}>
                    <circle cx="100" cy="85" r="50" />
                </clipPath>
            </defs>
            <path
                d="M100 10C58.5 10 25 43.5 25 85c0 45 50 90 75 110 25-20 75-65 75-110C175 43.5 141.5 10 100 10Zm0 20a55 55 0 1 0 0 110 55 55 0 1 0 0-110Z"
                fill={color}
                fillRule="evenodd"
            />
            <g clipPath={`url(#${clipId})`}>
                <rect x="64" y="90" width="18" height="60" rx="7" fill={color} />
                <rect x="91" y="70" width="18" height="85" rx="7" fill={barColor} fillOpacity={barOpacity} />
                <rect x="118" y="50" width="18" height="100" rx="7" fill={barColor} fillOpacity={barOpacity} />
            </g>
        </svg>
    );
}
