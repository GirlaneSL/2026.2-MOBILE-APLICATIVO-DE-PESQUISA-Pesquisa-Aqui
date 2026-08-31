import { FileText, UserRoundPlus, CloudAlert } from "lucide-react-native";
import { ReactNode } from "react";
import { Text, View, StyleSheet } from "react-native";

function StatCard({
    value,
    label,
    icon,
}: {
    value: string;
    label: string;
    icon: ReactNode;
}) {
    return (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                {icon}
            </View>

            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}

export default function Home() {
    return (
        <View style={styles.home}>
            <View style={styles.container}>
                <View style={styles.cardsContainer}>
                    <StatCard
                        value="0"
                        label="Pesquisas Ativas"
                        icon={<FileText size={25} color="#000" />}
                    />

                    <StatCard
                        value="0"
                        label="Pesquisadores em Campo"
                        icon={<UserRoundPlus size={25} color="#000" />}
                    />

                    <StatCard
                        value="0"
                        label="Sincronizações Pendentes"
                        icon={<CloudAlert size={25} color="#000" />}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    home: {
        marginTop: 30,
    },

    container: {
        padding: 5,
    },

    cardsContainer: {
        flexDirection: "row",
        gap: 8,
    },

    card: {
        flex: 1,
        minWidth: 0,
        borderWidth: 1,
        borderColor: "#00000015",
        borderRadius: 8,
        padding: 8,
        backgroundColor: "#fff",
    },

    iconContainer: {
        alignItems: "flex-end",
        marginBottom: 8,
    },

    value: {
        fontSize: 25,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#000",
    },

    label: {
        fontSize: 12,
        color: "#000",
    },
});



// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
// import { Feather } from '@expo/vector-icons';

// export default function HomePesquisador() {
//     const [isOnline, setIsOnline] = useState(false);
//     const [coletasPendentes, setColetasPendentes] = useState(3);

//     return (
//         <SafeAreaView style={styles.safeArea}>
//             <ScrollView contentContainerStyle={styles.scrollContainer}>

//                 <View style={styles.header}>
//                     <View>
//                         <Text style={styles.greetingText}>Bem-vindo,</Text>
//                         <Text style={styles.userName}>Kaiky</Text>
//                     </View>

//                     <View style={[styles.statusBadge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
//                         <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
//                         <Text style={[styles.statusText, isOnline ? styles.textOnline : styles.textOffline]}>
//                             {isOnline ? 'Online' : 'Offline'}
//                         </Text>
//                     </View>
//                 </View>

//                 <View style={styles.card}>
//                     <View style={styles.cardHeader}>
//                         <View style={styles.iconTitleGroup}>
//                             <View style={styles.iconContainer}>
//                                 <Feather name="cloud-off" size={24} color="#2563eb" />
//                             </View>
//                             <View>
//                                 <Text style={styles.cardTitle}>Fila Local</Text>
//                                 <Text style={styles.cardSubtitle}>Aguardando envio</Text>
//                             </View>
//                         </View>
//                         <Text style={styles.pendingCount}>{coletasPendentes}</Text>
//                     </View>

//                     <TouchableOpacity
//                         disabled={!isOnline || coletasPendentes === 0}
//                         style={[
//                             styles.syncButton,
//                             (isOnline && coletasPendentes > 0) ? styles.buttonActive : styles.buttonDisabled
//                         ]}
//                     >
//                         <Feather name="refresh-cw" size={18} color="white" />
//                         <Text style={styles.syncButtonText}>Sincronizar Coletas</Text>
//                     </TouchableOpacity>
//                 </View>

//                 <Text style={styles.sectionTitle}>Minhas Pesquisas</Text>

//                 <View style={styles.card}>
//                     <View style={styles.surveyHeader}>
//                         <Text style={styles.surveyTag}>EM CAMPO</Text>
//                         <Text style={styles.surveyTitle}>Censo Socioeconômico 2026</Text>
//                         <Text style={styles.surveyDescription}>Zona Rural - 4 distritos</Text>
//                     </View>

//                     <View style={styles.progressContainer}>
//                         <Text style={styles.progressLabel}>Sua meta:</Text>
//                         <Text style={styles.progressValue}>48 / 50 questionários</Text>
//                     </View>

//                     <TouchableOpacity style={styles.primaryButton}>
//                         <Text style={styles.primaryButtonText}>Iniciar Nova Coleta</Text>
//                     </TouchableOpacity>
//                 </View>

//                 <View style={[styles.card, styles.cardDashed]}>
//                     <View style={styles.downloadRow}>
//                         <View style={styles.downloadInfo}>
//                             <Text style={styles.downloadTitle}>Mapeamento Comercial</Text>
//                             <Text style={styles.downloadSubtitle}>12 questões • Requer download</Text>
//                         </View>
//                         <TouchableOpacity
//                             disabled={!isOnline}
//                             style={[styles.downloadIconBtn, isOnline ? styles.downloadIconActive : styles.downloadIconDisabled]}
//                         >
//                             <Feather name="download" size={20} color={isOnline ? '#2563eb' : '#94a3b8'} />
//                         </TouchableOpacity>
//                     </View>
//                 </View>

//             </ScrollView>
//         </SafeAreaView>
//     );
// }

// const styles = StyleSheet.create({
//     safeArea: {
//         flex: 1,
//         backgroundColor: '#f8fafc',
//     },
//     scrollContainer: {
//         paddingHorizontal: 20,
//         paddingTop: 24,
//         paddingBottom: 80,
//     },
//     header: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 32,
//     },
//     greetingText: {
//         fontSize: 14,
//         color: '#64748b',
//     },
//     userName: {
//         fontSize: 24,
//         fontWeight: 'bold',
//         color: '#0f172a',
//     },
//     statusBadge: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 9999,
//     },
//     badgeOnline: { backgroundColor: '#dcfce3' },
//     badgeOffline: { backgroundColor: '#fef3c7' },
//     statusDot: {
//         width: 8,
//         height: 8,
//         borderRadius: 4,
//         marginRight: 8,
//     },
//     dotOnline: { backgroundColor: '#16a34a' },
//     dotOffline: { backgroundColor: '#f59e0b' },
//     statusText: {
//         fontSize: 14,
//         fontWeight: '600',
//     },
//     textOnline: { color: '#15803d' },
//     textOffline: { color: '#b45309' },
//     card: {
//         backgroundColor: '#ffffff',
//         borderRadius: 16,
//         padding: 20,
//         marginBottom: 24,
//         borderColor: '#f1f5f9',
//         borderWidth: 1,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.05,
//         shadowRadius: 2,
//         elevation: 2,
//     },
//     cardHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 16,
//     },
//     iconTitleGroup: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     iconContainer: {
//         backgroundColor: '#eff6ff',
//         padding: 8,
//         borderRadius: 8,
//         marginRight: 12,
//     },
//     cardTitle: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: '#0f172a',
//     },
//     cardSubtitle: {
//         fontSize: 14,
//         color: '#64748b',
//     },
//     pendingCount: {
//         fontSize: 32,
//         fontWeight: '900',
//         color: '#2563eb',
//     },
//     syncButton: {
//         flexDirection: 'row',
//         justifyContent: 'center',
//         alignItems: 'center',
//         width: '100%',
//         paddingVertical: 12,
//         borderRadius: 12,
//     },
//     buttonActive: { backgroundColor: '#2563eb' },
//     buttonDisabled: { backgroundColor: '#cbd5e1' },
//     syncButtonText: {
//         color: '#ffffff',
//         fontWeight: 'bold',
//         fontSize: 16,
//         marginLeft: 8,
//     },
//     sectionTitle: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: '#0f172a',
//         marginBottom: 16,
//     },
//     surveyHeader: {
//         marginBottom: 16,
//     },
//     surveyTag: {
//         fontSize: 12,
//         fontWeight: '700',
//         color: '#2563eb',
//         marginBottom: 4,
//     },
//     surveyTitle: {
//         fontSize: 20,
//         fontWeight: 'bold',
//         color: '#0f172a',
//     },
//     surveyDescription: {
//         fontSize: 14,
//         color: '#64748b',
//         marginTop: 4,
//     },
//     progressContainer: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         backgroundColor: '#f8fafc',
//         padding: 12,
//         borderRadius: 8,
//         marginBottom: 16,
//         borderColor: '#f1f5f9',
//         borderWidth: 1,
//     },
//     progressLabel: {
//         fontSize: 14,
//         color: '#475569',
//     },
//     progressValue: {
//         fontSize: 14,
//         fontWeight: 'bold',
//         color: '#0f172a',
//     },
//     primaryButton: {
//         backgroundColor: '#0f172a',
//         width: '100%',
//         paddingVertical: 16,
//         borderRadius: 12,
//         alignItems: 'center',
//     },
//     primaryButtonText: {
//         color: '#ffffff',
//         fontWeight: 'bold',
//         fontSize: 16,
//     },
//     cardDashed: {
//         borderStyle: 'dashed',
//         borderColor: '#cbd5e1',
//         borderWidth: 2,
//         elevation: 0,
//         shadowOpacity: 0,
//     },
//     downloadRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//     },
//     downloadInfo: {
//         flex: 1,
//         paddingRight: 16,
//     },
//     downloadTitle: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#0f172a',
//     },
//     downloadSubtitle: {
//         fontSize: 14,
//         color: '#64748b',
//         marginTop: 2,
//     },
//     downloadIconBtn: {
//         padding: 12,
//         borderRadius: 8,
//     },
//     downloadIconActive: { backgroundColor: '#eff6ff' },
//     downloadIconDisabled: { backgroundColor: '#f1f5f9' },
// });