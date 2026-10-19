import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LocalCollection } from '@/lib/collectionStore';
import { isAnswerEmpty } from '@/lib/displayRules';
import { Brand } from '@/constants/brand';

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
                        {title}: {drafts.length} rascunhos
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
                                    <ChevronRight size={20} color={Brand.green} />
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
    backdrop: { flex: 1, backgroundColor: 'rgba(10,20,16,0.55)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: Brand.card,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 22,
        maxHeight: '80%',
    },
    title: { fontSize: 22, fontWeight: '600', letterSpacing: -0.6, color: Brand.ink },
    subtitle: { fontSize: 14, color: Brand.muted, marginTop: 4, marginBottom: 14 },
    list: { flexGrow: 0 },
    listContent: { gap: 10, paddingBottom: 4 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: Brand.line,
        borderRadius: 20,
        padding: 15,
        backgroundColor: Brand.paper,
    },
    itemInfo: { flex: 1, gap: 2 },
    itemTitle: { fontSize: 15, fontWeight: '600', color: Brand.ink },
    itemRecent: { fontSize: 12, color: Brand.clayInk, fontWeight: '600' },
    itemText: { fontSize: 13, color: Brand.muted },
    itemCount: { fontSize: 13.5, color: Brand.greenDeep, fontWeight: '600', marginTop: 2 },
    cancel: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 46,
        marginTop: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#cdd5d0',
    },
    cancelText: { fontSize: 15, color: Brand.ink, fontWeight: '500' },
});
