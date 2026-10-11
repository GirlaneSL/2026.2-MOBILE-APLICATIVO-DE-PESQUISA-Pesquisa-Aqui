import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SUPPORTED_QUESTION_TYPES } from '@/lib/collectionStore';
import type { AnswerValue, PackageQuestion } from '@/lib/displayRules';

interface QuestionInputProps {
    question: PackageQuestion;
    value: AnswerValue;
    onChange: (value: AnswerValue) => void;
}

function maskDate(text: string): string {
    const d = text.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function maskTime(text: string): string {
    const d = text.replace(/\D/g, '').slice(0, 4);
    return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** Mensagem de formato inválido (ou null). Resposta vazia não é erro de formato. */
export function getFormatError(question: PackageQuestion, value: AnswerValue): string | null {
    if (typeof value !== 'string' || value.trim() === '') return null;

    if (question.type === 'NUMERIC' && Number.isNaN(Number(value.replace(',', '.')))) {
        return 'Informe um número válido.';
    }
    if (question.type === 'DATE') {
        const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        const date = m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
        const valid = date && date.getDate() === Number(m![1]) && date.getMonth() === Number(m![2]) - 1;
        if (!valid) return 'Informe uma data válida no formato DD/MM/AAAA.';
    }
    if (question.type === 'TIME') {
        const m = value.match(/^(\d{2}):(\d{2})$/);
        if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return 'Informe um horário válido no formato HH:MM.';
    }
    return null;
}

export default function QuestionInput({ question, value, onChange }: QuestionInputProps) {
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const options = [...(question.options ?? [])].sort((a, b) => a.order - b.order);

    if (!SUPPORTED_QUESTION_TYPES.has(question.type)) {
        return (
            <View style={styles.notice}>
                <Text style={styles.noticeText}>
                    Este tipo de questão ({question.type}) ainda não é suportado nesta versão do app. Pode avançar.
                </Text>
            </View>
        );
    }

    switch (question.type) {
        case 'FREE_TEXT':
            return (
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={typeof value === 'string' ? value : ''}
                    onChangeText={onChange}
                    placeholder="Digite a resposta"
                    placeholderTextColor="#a1a1aa"
                    multiline
                    textAlignVertical="top"
                />
            );

        case 'NUMERIC':
            return (
                <TextInput
                    style={styles.input}
                    value={typeof value === 'string' ? value : ''}
                    onChangeText={(t) => onChange(t.replace(/[^0-9.,-]/g, ''))}
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    keyboardType="numbers-and-punctuation"
                />
            );

        case 'DATE':
            return (
                <TextInput
                    style={styles.input}
                    value={typeof value === 'string' ? value : ''}
                    onChangeText={(t) => onChange(maskDate(t))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#a1a1aa"
                    keyboardType="number-pad"
                    maxLength={10}
                />
            );

        case 'TIME':
            return (
                <TextInput
                    style={styles.input}
                    value={typeof value === 'string' ? value : ''}
                    onChangeText={(t) => onChange(maskTime(t))}
                    placeholder="HH:MM"
                    placeholderTextColor="#a1a1aa"
                    keyboardType="number-pad"
                    maxLength={5}
                />
            );

        case 'YES_NO':
            return (
                <View style={styles.row}>
                    {[
                        { label: 'Sim', val: true },
                        { label: 'Não', val: false },
                    ].map((opt) => (
                        <TouchableOpacity
                            key={opt.label}
                            style={[styles.choice, styles.flex, value === opt.val && styles.choiceSelected]}
                            onPress={() => onChange(opt.val)}
                        >
                            <Text style={[styles.choiceText, value === opt.val && styles.choiceTextSelected]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            );

        case 'SINGLE_CHOICE':
            return (
                <View style={styles.column}>
                    {options.map((opt) => {
                        const selected = value === opt.id;
                        return (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.choice, selected && styles.choiceSelected]}
                                onPress={() => onChange(opt.id)}
                            >
                                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{opt.text}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );

        case 'MULTIPLE_CHOICE': {
            const selectedIds = Array.isArray(value) ? value : [];
            const toggle = (id: number) => {
                const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
                onChange(next);
            };
            return (
                <View style={styles.column}>
                    {options.map((opt) => {
                        const selected = selectedIds.includes(opt.id);
                        return (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.choice, selected && styles.choiceSelected]}
                                onPress={() => toggle(opt.id)}
                            >
                                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{opt.text}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );
        }

        case 'SCALE_1_5':
            return (
                <View style={styles.row}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <TouchableOpacity
                            key={n}
                            style={[styles.choice, styles.flex, value === n && styles.choiceSelected]}
                            onPress={() => onChange(n)}
                        >
                            <Text style={[styles.choiceText, value === n && styles.choiceTextSelected]}>{n}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            );

        case 'LOCATION': {
            const capture = async () => {
                setLocating(true);
                setLocationError(null);
                try {
                    const permission = await Location.requestForegroundPermissionsAsync();
                    if (!permission.granted) {
                        setLocationError('Permissão de localização negada.');
                        return;
                    }
                    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    onChange(
                        JSON.stringify({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        }),
                    );
                } catch {
                    setLocationError('Não foi possível obter a localização. Tente novamente.');
                } finally {
                    setLocating(false);
                }
            };

            let label: string | null = null;
            if (typeof value === 'string' && value) {
                try {
                    const p = JSON.parse(value);
                    label = `${Number(p.latitude).toFixed(5)}, ${Number(p.longitude).toFixed(5)}`;
                } catch {
                    label = value;
                }
            }

            return (
                <View style={styles.column}>
                    <TouchableOpacity style={[styles.choice, styles.rowCenter]} onPress={capture} disabled={locating}>
                        {locating ? <ActivityIndicator size="small" color="#447762" /> : <MapPin size={18} color="#447762" />}
                        <Text style={styles.choiceText}>{label ? 'Capturar novamente' : 'Capturar localização atual'}</Text>
                    </TouchableOpacity>
                    {label ? <Text style={styles.locationValue}>{label}</Text> : null}
                    {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
                </View>
            );
        }

        default:
            return null;
    }
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderColor: '#d4d4d8',
        borderRadius: 8,
        backgroundColor: '#fff',
        padding: 14,
        fontSize: 16,
        color: '#18181b',
    },
    multiline: { minHeight: 120 },
    row: { flexDirection: 'row', gap: 8 },
    rowCenter: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
    column: { gap: 8 },
    flex: { flex: 1 },
    choice: {
        borderWidth: 1,
        borderColor: '#d4d4d8',
        borderRadius: 8,
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    choiceSelected: { borderColor: '#447762', backgroundColor: '#e8f1ed' },
    choiceText: { fontSize: 16, color: '#18181b' },
    choiceTextSelected: { color: '#447762', fontWeight: 'bold' },
    notice: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 14 },
    noticeText: { color: '#92400e', fontSize: 14 },
    locationValue: { fontSize: 14, color: '#447762', textAlign: 'center' },
    errorText: { fontSize: 14, color: '#b91c1c' },
});
