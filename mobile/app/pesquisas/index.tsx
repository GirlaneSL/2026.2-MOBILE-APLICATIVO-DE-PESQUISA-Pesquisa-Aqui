import React from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import PesquisaCard from './_components/PesquisaCard';

const PESQUISAS = [
    {
        id: '1',
        titulo: 'Satisfação de Clientes 2026',
        empresa: 'Empresa Alpha',
        questoes: 15,
        status: 'baixada',
    },
    {
        id: '2',
        titulo: 'Mapeamento de Mercado - Região Sul',
        empresa: 'Empresa Beta',
        questoes: 42,
        status: 'pendente',
    }
];

export default function Pesquisas() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Minhas Pesquisas</Text>
                <Text style={styles.headerSubtitle}>Selecione um questionário para iniciar</Text>
            </View>

            <FlatList
                data={PESQUISAS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <PesquisaCard
                        titulo={item.titulo}
                        empresa={item.empresa}
                        questoes={item.questoes}
                        status={item.status}
                    />
                )}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#18181b',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#71717a',
        marginTop: 4,
    },
    listContainer: {
        padding: 20,
        gap: 16,
    },
});