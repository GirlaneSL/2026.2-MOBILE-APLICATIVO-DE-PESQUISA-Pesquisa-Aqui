import { Image } from 'expo-image';
import { Camera, Settings, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AnswerValue, PackageQuestion } from '@/lib/displayRules';
import { capturePhoto, formatBytes } from '@/lib/photoStorage';
import { getPhotoLimit, getPhotoUris } from '@/lib/questionTypes';

interface PhotoAnswerProps {
    question: PackageQuestion;
    value: AnswerValue;
    onChange: (value: AnswerValue) => void;
    error: string | null;
    /** UUID da coleta: a foto é guardada na pasta dela, ligada a esta coleta. */
    collectionId: string;
}

type CameraProblem = { kind: 'denied'; canAskAgain: boolean } | { kind: 'error'; message: string };

/**
 * Questões de foto e de várias fotos. Abre a câmera, guarda a imagem reduzida no aparelho (sem rede)
 * e mostra o que já foi tirado, com opção de remover antes do envio. A resposta guarda o endereço
 * de cada arquivo: um texto em "foto", uma lista em "várias fotos".
 */
export default function PhotoAnswer({ question, value, onChange, error, collectionId }: PhotoAnswerProps) {
    const multiple = question.type === 'MULTIPLE_PHOTOS';
    const limit = getPhotoLimit(question);
    const uris = getPhotoUris(value);
    const atLimit = uris.length >= limit;

    const [capturing, setCapturing] = useState(false);
    const [problem, setProblem] = useState<CameraProblem | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [lastSize, setLastSize] = useState<number | null>(null);

    // Sempre a lista mais nova, mesmo que a tela tenha re-renderizado enquanto a câmera estava aberta
    const latestUris = useRef(uris);
    useEffect(() => {
        latestUris.current = uris;
    });

    const commit = (next: string[]) => onChange(multiple ? next : (next[0] ?? ''));

    const takePhoto = async () => {
        if (capturing) return;

        if (multiple && atLimit) {
            // Não ignora o toque: explica por que a câmera não abriu
            Alert.alert(
                'Limite de fotos atingido',
                `Já foram tiradas ${limit} ${limit === 1 ? 'foto' : 'fotos'}, que é o máximo desta questão. Remova uma para tirar outra.`,
            );
            return;
        }

        setProblem(null);
        setCapturing(true);
        try {
            const result = await capturePhoto(collectionId);
            if (result.status === 'ok') {
                setLastSize(result.sizeBytes);
                // "Foto" única: a nova substitui a anterior (a antiga é apagada do aparelho pela tela)
                commit(multiple ? [...latestUris.current, result.uri] : [result.uri]);
            } else if (result.status === 'denied') {
                setProblem({ kind: 'denied', canAskAgain: result.canAskAgain });
            } else if (result.status === 'error') {
                setProblem({ kind: 'error', message: result.message });
            }
        } finally {
            setCapturing(false);
        }
    };

    const confirmRemove = (uri: string, position: number) => {
        Alert.alert(
            'Remover foto',
            `Remover a foto ${position} desta questão? Ela será apagada do aparelho e não poderá ser recuperada.`,
            [
                { text: 'Manter', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => commit(latestUris.current.filter((item) => item !== uri)),
                },
            ],
        );
    };

    const openSettings = () => {
        Linking.openSettings().catch(() => undefined);
    };

    const buttonLabel =
        uris.length === 0 ? 'Tirar foto' : multiple ? 'Tirar outra foto' : 'Substituir foto';

    return (
        <View style={styles.column}>
            {multiple ? (
                <Text style={[styles.hint, atLimit && styles.hintLimit]}>
                    {uris.length} de {limit} {limit === 1 ? 'foto' : 'fotos'}
                    {atLimit ? ' — limite atingido' : ''}
                </Text>
            ) : null}

            <TouchableOpacity
                style={[styles.cameraButton, multiple && atLimit && styles.cameraButtonBlocked]}
                onPress={takePhoto}
                disabled={capturing}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={buttonLabel}
            >
                {capturing ? <ActivityIndicator size="small" color="#447762" /> : <Camera size={20} color="#447762" />}
                <Text style={styles.cameraButtonText}>{capturing ? 'Gravando foto…' : buttonLabel}</Text>
            </TouchableOpacity>

            {lastSize !== null ? (
                <Text style={styles.hint}>Última foto reduzida para {formatBytes(lastSize)} e guardada no aparelho.</Text>
            ) : null}

            {problem?.kind === 'denied' ? (
                <View style={styles.notice}>
                    <Text style={styles.noticeText}>
                        {problem.canAskAgain
                            ? 'Sem a permissão da câmera não dá para fotografar. Toque em "Tirar foto" e permita o acesso quando o aparelho perguntar.'
                            : 'A permissão da câmera está desligada para este aplicativo. Libere o acesso à câmera nas configurações do aparelho para tirar fotos. As outras questões continuam funcionando.'}
                    </Text>
                    {!problem.canAskAgain ? (
                        <TouchableOpacity style={styles.settingsButton} onPress={openSettings} accessibilityRole="button">
                            <Settings size={16} color="#92400e" />
                            <Text style={styles.settingsButtonText}>Abrir configurações</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null}

            {problem?.kind === 'error' ? <Text style={styles.errorText}>{problem.message}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {uris.length > 0 ? (
                <View style={styles.grid}>
                    {uris.map((uri, index) => (
                        <View key={uri} style={styles.tile}>
                            <TouchableOpacity
                                onPress={() => setPreview(uri)}
                                activeOpacity={0.8}
                                accessibilityRole="imagebutton"
                                accessibilityLabel={`Ver foto ${index + 1}`}
                            >
                                <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => confirmRemove(uri, index + 1)}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel={`Remover foto ${index + 1}`}
                            >
                                <X size={14} color="#fff" strokeWidth={3} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            ) : null}

            <Modal visible={preview !== null} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
                <View style={styles.previewBackdrop}>
                    {preview ? <Image source={{ uri: preview }} style={styles.previewImage} contentFit="contain" /> : null}
                    <TouchableOpacity
                        style={styles.previewClose}
                        onPress={() => setPreview(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Fechar foto"
                    >
                        <X size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const TILE_SIZE = 96;

const styles = StyleSheet.create({
    column: { gap: 8 },
    hint: { fontSize: 13, color: '#71717a' },
    hintLimit: { color: '#92400e', fontWeight: '600' },
    errorText: { fontSize: 14, color: '#b91c1c' },
    cameraButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 56,
        borderWidth: 1,
        borderColor: '#d4d4d8',
        borderRadius: 8,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
    },
    cameraButtonBlocked: { opacity: 0.55 },
    cameraButtonText: { fontSize: 16, color: '#18181b' },
    notice: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 14, gap: 10 },
    noticeText: { color: '#92400e', fontSize: 14, lineHeight: 20 },
    settingsButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
    settingsButtonText: { color: '#92400e', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { width: TILE_SIZE, height: TILE_SIZE },
    thumb: { width: TILE_SIZE, height: TILE_SIZE, borderRadius: 8, backgroundColor: '#e4e4e7' },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#b91c1c',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
    previewImage: { width: '100%', height: '80%' },
    previewClose: {
        position: 'absolute',
        top: 48,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
