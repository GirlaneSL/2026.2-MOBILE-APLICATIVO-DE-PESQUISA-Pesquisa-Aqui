import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Brand } from '@/constants/brand';

interface ProgressBarProps {
    /** 0 a 100. */
    percent: number;
    color?: string;
    height?: number;
    delay?: number;
}

/** Barra que se enche de um lado ao outro quando aparece ou quando o valor muda. */
export default function ProgressBar({ percent, color = Brand.green, height = 8, delay = 0 }: ProgressBarProps) {
    const width = useSharedValue(0);

    useEffect(() => {
        width.value = withDelay(delay, withTiming(percent, { duration: 750, easing: Easing.out(Easing.cubic) }));
    }, [percent, delay, width]);

    const fill = useAnimatedStyle(() => ({ width: `${width.value}%` }));

    return (
        <View style={[styles.track, { height, borderRadius: height / 2 }]}>
            <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, fill]} />
        </View>
    );
}

const styles = StyleSheet.create({
    track: { width: '100%', backgroundColor: Brand.trackLight, overflow: 'hidden' },
});
