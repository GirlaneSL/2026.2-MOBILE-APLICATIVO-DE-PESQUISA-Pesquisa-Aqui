import { useId } from 'react';
import Svg, { ClipPath, Circle, Defs, G, Path, Rect } from 'react-native-svg';

const BRAND_COLOR = '#2D474C';
const BRAND_ACCENT = '#6B7785';

/**
 * Marca do app: pino de mapa com o gráfico de barras dentro (mesma arte da logo do painel web).
 * Sem `color` usa as cores oficiais. Em fundo escuro passe só `color` (ex.: menta): as barras
 * da direita viram uma versão mais suave da mesma cor. `accent` força a cor dessas duas barras.
 */
export default function BrandMark({
    size = 26,
    color = BRAND_COLOR,
    accent,
}: {
    size?: number;
    color?: string;
    accent?: string;
}) {
    const clipId = `brand-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const custom = color !== BRAND_COLOR;
    const barColor = accent ?? (custom ? color : BRAND_ACCENT);
    const barOpacity = accent === undefined && custom ? 0.55 : 1;

    return (
        <Svg width={size} height={size} viewBox="0 0 200 200">
            <Defs>
                <ClipPath id={clipId}>
                    <Circle cx={100} cy={85} r={50} />
                </ClipPath>
            </Defs>
            <Path
                d="M100 10C58.5 10 25 43.5 25 85c0 45 50 90 75 110 25-20 75-65 75-110C175 43.5 141.5 10 100 10Zm0 20a55 55 0 1 0 0 110 55 55 0 1 0 0-110Z"
                fill={color}
                fillRule="evenodd"
            />
            <G clipPath={`url(#${clipId})`}>
                <Rect x={64} y={90} width={18} height={60} rx={7} fill={color} />
                <Rect x={91} y={70} width={18} height={85} rx={7} fill={barColor} fillOpacity={barOpacity} />
                <Rect x={118} y={50} width={18} height={100} rx={7} fill={barColor} fillOpacity={barOpacity} />
            </G>
        </Svg>
    );
}
