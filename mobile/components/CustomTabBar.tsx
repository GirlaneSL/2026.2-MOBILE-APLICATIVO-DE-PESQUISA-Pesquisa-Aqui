import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FileText, Home, User, CloudSync } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    return (
        <View style={styles.container}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label = options.title !== undefined ? options.title : route.name;
                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                const color = isFocused ? '#007AFF' : '#8E8E93';

                // 2. Define qual componente de ícone será renderizado
                let IconComponent = Home; // Padrão

                if (route.name.includes('pesquisas')) {
                    IconComponent = FileText;
                }

                if (route.name.includes('usuario')) {
                    IconComponent = User;
                }

                if (route.name.includes('sincronizacao')) {
                    IconComponent = CloudSync;
                }

                return (
                    <TouchableOpacity key={index} onPress={onPress} style={styles.tabButton}>
                        {/* 3. Renderiza o ícone passando o tamanho e a cor (que muda se estiver focado) */}
                        <IconComponent color={color} size={24} />

                        <Text style={[styles.label, { color }]}>{label as string}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row', backgroundColor: '#FFFFFF', height: 65,
        borderTopWidth: 1, borderColor: '#E5E5E5', elevation: 8,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: -3 },
    },
    tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 12, marginTop: 4, fontWeight: '500' },
});