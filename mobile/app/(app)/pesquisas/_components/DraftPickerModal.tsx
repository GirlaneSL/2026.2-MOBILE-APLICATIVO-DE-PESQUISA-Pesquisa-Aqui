import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LocalCollection } from '@/lib/collectionStore';
import { isAnswerEmpty } from '@/lib/displayRules';

interface DraftPickerModalProps {
    visible: boolean;
    title: string;
    /** Rascunhos da pesquisa, já ordenados (o mais recente primeiro). */
    drafts: LocalCollection[];
    onSelect: (draft: LocalCollection) => void;
    onClose: () => void;
}

function formatDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
}

const answeredCount = (draft: LocalCollection) =>
    Object.values(draft.answers).filter((value) => !isAnswerEmpty(value)).length;

/** Lista os rascunhos de uma pesquisa para o pesquisador escolher qual continuar editando. */
export default function DraftPickerModal({ visible, title, drafts, onSelect, onClose }: DraftPickerModalProps) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                {/* Pressable interno: tocar dentro da folha não fecha o modal */}
                <Pressable style={styles.sheet} onPress={() => undefined}>
                    <Text style={styles.title}>Escolha o rascunho</Text>
                    <Text style={styles.subtitle} numberOfLines={2}>
                        {title} · {drafts.length} rascunhos
                    </Text>

                    <FlatList
                        data={drafts}
                        keyExtractor={(draft) => draft.clientId}
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item, index }) => {
                            const count = answeredCount(item);
                            return (
                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => onSelect(item)}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                >
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemTitle}>
                                            Iniciado em {formatDateTime(item.startedAt)}
                                        </Text>
                                        {index === 0 ? <Text style={styles.itemRecent}>Editado por último</Text> : null}
                                        <Text style={styles.itemText}>
                                            Última edição em {formatDateTime(item.updatedAt)}
                                        </Text>
                                        <Text style={styles.itemCount}>
                                            {count} {count === 1 ? 'questão respondida' : 'questões respondidas'}
                                        </Text>
                                    </View>
                                    <ChevronRight size={20} color="#447762" />
                                </TouchableOpacity>
                            );
                        }}
                    />

                    <TouchableOpacity style={styles.cancel} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
        maxHeight: '80%',
    },
    title: { fontSize: 20, fontWeight: 'bold', color: '#18181b' },
    subtitle: { fontSize: 14, color: '#71717a', marginTop: 4, marginBottom: 12 },
    list: { flexGrow: 0 },
    listContent: { gap: 10, paddingBottom: 4 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#d4d4d8',
        borderRadius: 8,
        padding: 14,
        backgroundColor: '#fafafa',
    },
    itemInfo: { flex: 1, gap: 2 },
    itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#18181b' },
    itemRecent: { fontSize: 12, color: '#B66D56', fontWeight: '600' },
    itemText: { fontSize: 13, color: '#71717a' },
    itemCount: { fontSize: 14, color: '#447762', fontWeight: '600', marginTop: 2 },
    cancel: { alignItems: 'center', padding: 14, marginTop: 8 },
    cancelText: { fontSize: 16, color: '#52525b', fontWeight: '600' },
});
