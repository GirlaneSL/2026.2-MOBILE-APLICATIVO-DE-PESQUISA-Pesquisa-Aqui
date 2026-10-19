import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface ContourProps {
    seed?: number;
    rings?: number;
    /** Centro das curvas, de 0 a 1. */
    cx?: number;
    cy?: number;
    size?: number;
    width?: number;
    height?: number;
    /** Cor das curvas. Em fundo escuro use um verde mais claro. */
    color?: string;
    highlight?: string;
    opacity?: number;
}

/** Curvas de nível geradas por código: cada anel é um círculo deformado. */
export default function Contour({
    seed = 1,
    rings = 10,
    cx = 0.5,
    cy = 0.5,
    size = 1,
    width = 352,
    height = 330,
    color = '#447762',
    highlight = '#5d9a80',
    opacity = 1,
}: ContourProps) {
    const base = Math.min(width, height) * 0.07 * size;
    const paths: { d: string; strong: boolean }[] = [];

    for (let k = 1; k <= rings; k++) {
        const r = base * k * 0.95;
        let d = '';
        for (let i = 0; i <= 90; i++) {
            const t = (i / 90) * Math.PI * 2;
            const f =
                1 +
                0.15 * Math.sin(2 * t + seed + k * 0.12) +
                0.09 * Math.sin(3 * t + seed * 1.7) +
                0.05 * Math.sin(5 * t + seed * 2.3 + k * 0.2);
            const x = width * cx + r * f * Math.cos(t) * 1.3;
            const y = height * cy + r * f * Math.sin(t) * 0.82;
            d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        paths.push({ d: `${d}Z`, strong: k % 3 === 0 });
    }

    return (
        <Svg
            style={StyleSheet.absoluteFill}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid slice"
            pointerEvents="none"
        >
            {paths.map((p, i) => (
                <Path
                    key={i}
                    d={p.d}
                    fill="none"
                    stroke={p.strong ? highlight : color}
                    strokeWidth={1}
                    strokeLinejoin="round"
                    opacity={(p.strong ? 0.9 : 0.55) * opacity}
                />
            ))}
        </Svg>
    );
}
