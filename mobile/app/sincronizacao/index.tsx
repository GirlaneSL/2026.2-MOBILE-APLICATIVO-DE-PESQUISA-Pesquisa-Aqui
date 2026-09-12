import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { CloudUpload } from 'lucide-react-native';
import SyncCard from './_components/SyncCard';

const RESPOSTAS_LOCAIS = [
    {
        id: '1',
        pesquisaTitulo: 'Satisfação de Clientes 2026',
        identificadorEntrevistado: 'Entrevista #1042',
        dataColeta: '12/09/2026 - 14:30',
        status: 'pendente',
    },
    {
        id: '2',
        pesquisaTitulo: 'Satisfação de Clientes 2026',
        identificadorEntrevistado: 'Entrevista #1043',
        dataColeta: '12/09/2026 - 15:10',
        status: 'pendente',
    },
    {
        id: '3',
        pesquisaTitulo: 'Mapeamento de Mercado',
        identificadorEntrevistado: 'Entrevista #0890',
        dataColeta: '11/09/2026 - 17:45',
        status: 'sincronizado',
    },
];

export default function Sincronizacao() {
    const [fila, setFila] = useState(RESPOSTAS_LOCAIS);
    const pendentesCount = fila.filter(item => item.status === 'pendente').length;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Fila de Sincronização</Text>
                <Text style={styles.headerSubtitle}>
                    {pendentesCount > 0
                        ? `Você tem ${pendentesCount} respostas aguardando envio`
                        : 'Todas as coletas foram enviadas ao servidor'}
                </Text>
            </View>

            <FlatList
                data={fila}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <SyncCard
                        identificador={item.identificadorEntrevistado}
                        pesquisa={item.pesquisaTitulo}
                        data={item.dataColeta}
                        status={item.status}
                    />
                )}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.syncButton, pendentesCount === 0 && styles.syncButtonDisabled]}
                    disabled={pendentesCount === 0}
                    activeOpacity={0.8}
                >
                    <CloudUpload size={22} color="#fff" />
                    <Text style={styles.syncButtonText}>
                        {pendentesCount > 0 ? `Enviar ${pendentesCount} Coletas` : 'Tudo Atualizado'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fafafa' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#18181b' },
    headerSubtitle: { fontSize: 15, color: '#71717a', marginTop: 4 },
    listContainer: { padding: 20, gap: 12, paddingBottom: 100 },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 20, backgroundColor: '#fafafa',
        borderTopWidth: 1, borderColor: '#e4e4e7',
    },
    syncButton: {
        backgroundColor: '#447762', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 10,
    },
    syncButtonDisabled: { backgroundColor: '#a1a1aa' },
    syncButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});