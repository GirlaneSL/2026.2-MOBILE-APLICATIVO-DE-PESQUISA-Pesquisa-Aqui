import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
    children: ReactNode;
    /** Estilo do conteúdo que encolhe ao toque. */
    style?: StyleProp<ViewStyle>;
    /** Estilo do toque em si (ex.: `flex: 1` dentro de uma linha). */
    containerStyle?: StyleProp<ViewStyle>;
    scaleTo?: number;
}

/** Toque com resposta física: o cartão afunda um pouco e volta com mola. */
export default function PressableScale({
    children,
    style,
    containerStyle,
    scaleTo = 0.97,
    onPressIn,
    onPressOut,
    ...rest
}: PressableScaleProps) {
    const scale = useSharedValue(1);
    const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <Pressable
            {...rest}
            style={containerStyle}
            onPressIn={(event) => {
                scale.value = withSpring(scaleTo, { damping: 20, stiffness: 380 });
                onPressIn?.(event);
            }}
            onPressOut={(event) => {
                scale.value = withSpring(1, { damping: 14, stiffness: 260 });
                onPressOut?.(event);
            }}
        >
            <Animated.View style={[style, animated]}>{children}</Animated.View>
        </Pressable>
    );
}
