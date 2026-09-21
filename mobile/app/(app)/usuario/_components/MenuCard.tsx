import React, { ReactNode } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { ChevronRight, Bolt } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MenuCardProps {
    label: string;
    icon: ReactNode;
    onPress?: () => void;
}

export default function MenuCard({ label, icon, onPress }: MenuCardProps) {
    return (
        <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
            <LinearGradient
                colors={['#B66D561A', '#FFFFFF1A', '#124B521A']}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <View style={styles.cardContent}>
                    <View style={styles.leftContent}>
                        {icon}
                        <Text style={styles.label}>{label}</Text>
                    </View>
                    <ChevronRight size={20} color="#a1a1aa" />
                </View>

                {/* Ícones decorativos nos cantos */}
                <Bolt size={10} style={styles.bolt1} />
                <Bolt size={10} style={styles.bolt2} />
                <Bolt size={10} style={styles.bolt3} />
                <Bolt size={10} style={styles.bolt4} />
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 13,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#00000015',
        position: 'relative',
        backgroundColor: '#fff',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1, // Fica acima do fundo
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    label: {
        fontSize: 16,
        color: '#27272a',
        fontWeight: '500',
    },
    bolt1: { position: 'absolute', top: 4, left: 4, opacity: 0.4 },
    bolt2: { position: 'absolute', top: 4, right: 4, opacity: 0.4 },
    bolt3: { position: 'absolute', bottom: 4, left: 4, opacity: 0.4 },
    bolt4: { position: 'absolute', bottom: 4, right: 4, opacity: 0.4 },
});