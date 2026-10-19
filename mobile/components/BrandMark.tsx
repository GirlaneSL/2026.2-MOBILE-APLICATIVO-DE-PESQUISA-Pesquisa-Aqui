import Svg, { Path } from 'react-native-svg';

/** Marca do app: pino de mapa vazado. */
export default function BrandMark({ size = 26, color = '#447762' }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 200 200">
            <Path
                d="M100 10C58.5 10 25 43.5 25 85c0 45 50 90 75 110 25-20 75-65 75-110C175 43.5 141.5 10 100 10Zm0 20a55 55 0 1 0 0 110 55 55 0 1 0 0-110Z"
                fill={color}
                fillRule="evenodd"
            />
        </Svg>
    );
}
