import { useEffect, useRef, useState } from 'react';
import { Text, TextProps } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

interface CountUpProps extends TextProps {
    value: number;
}

/** Número que "rola" até o valor novo (saída rápida, chegada suave). Sem animação se o sistema pedir menos movimento. */
export default function CountUp({ value, style, ...rest }: CountUpProps) {
    const reduce = useReducedMotion();
    const [display, setDisplay] = useState(reduce ? value : 0);
    const shown = useRef(display);

    useEffect(() => {
        if (reduce) {
            shown.current = value;
            setDisplay(value);
            return;
        }
        const from = shown.current;
        if (from === value) return;
        const duration = Math.min(1000, 350 + Math.abs(value - from) * 45);
        const start = Date.now();
        let raf = 0;
        const tick = () => {
            const t = Math.min(1, (Date.now() - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const next = Math.round(from + (value - from) * eased);
            shown.current = next;
            setDisplay(next);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, reduce]);

    return (
        <Text style={style} {...rest}>
            {display}
        </Text>
    );
}
