import * as Location from 'expo-location';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from '@/components/DateTimePickerModal';
import type { AnswerValue, PackageQuestion } from '@/lib/displayRules';
import {
    getQuestionLimits,
    isQuestionTypeSupported,
    validateAnswer,
    type SupportedQuestionType,
} from '@/lib/questionTypes';

interface QuestionInputProps {
    question: PackageQuestion;
    value: AnswerValue;
    onChange: (value: AnswerValue) => void;
}

interface InputProps extends QuestionInputProps {
    /** Mensagem do que era esperado (ou null). Já vem calculada com os limites do pacote. */
    error: string | null;
    /** Avisa que o pesquisador saiu do campo: só então o erro de digitação passa a aparecer. */
    onBlur: () => void;
}

/** Deixa passar só número: dígitos, um separador decimal e (se o mínimo permitir) o sinal de menos. */
function sanitizeNumeric(text: string, allowNegative: boolean): string {
    let out = text.replace(/[^0-9.,-]/g, '');
    const negative = allowNegative && out.startsWith('-');
    out = out.replace(/-/g, '');
    const firstSeparator = out.search(/[.,]/);
    if (firstSeparator !== -1) {
        out = out.slice(0, firstSeparator + 1) + out.slice(firstSeparator + 1).replace(/[.,]/g, '');
    }
    return (negative ? '-' : '') + out;
}

const asText = (value: AnswerValue) => (typeof value === 'string' ? value : '');

// ---------- Um desenhista por tipo ----------

function TextAnswer({ question, value, onChange, error, onBlur }: InputProps) {
    const { maxLength } = getQuestionLimits(question);
    const text = asText(value);
    const atLimit = maxLength !== undefined && text.length >= maxLength;

    return (
        <View style={styles.column}>
            <TextInput
                style={[styles.input, styles.multiline, error ? styles.inputError : null]}
                value={text}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Digite a resposta"
                placeholderTextColor="#a1a1aa"
                maxLength={maxLength}
                multiline
                textAlignVertical="top"
            />
            {maxLength !== undefined ? (
                <Text style={[styles.counter, atLimit && styles.counterLimit]}>
                    {text.length}/{maxLength} caracteres{atLimit ? ' — limite atingido' : ''}
                </Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

function NumericAnswer({ question, value, onChange, error, onBlur }: InputProps) {
    const { minValue, maxValue } = getQuestionLimits(question);
    const allowNegative = minValue === undefined || minValue < 0;

    const hint =
        minValue !== undefined && maxValue !== undefined
            ? `Entre ${minValue} e ${maxValue}`
            : minValue !== undefined
              ? `Mínimo ${minValue}`
              : maxValue !== undefined
                ? `Máximo ${maxValue}`
                : null;

    return (
        <View style={styles.column}>
            <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={asText(value)}
                onChangeText={(t) => onChange(sanitizeNumeric(t, allowNegative))}
                onBlur={onBlur}
                placeholder="0"
                placeholderTextColor="#a1a1aa"
                keyboardType={allowNegative ? 'numbers-and-punctuation' : 'decimal-pad'}
            />
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

function PickerAnswer({
    mode,
    question,
    value,
    onChange,
    error,
}: InputProps & { mode: 'date' | 'time' }) {
    const [open, setOpen] = useState(false);
    const { minDate, maxDate } = getQuestionLimits(question);
    const text = asText(value);
    const Icon = mode === 'date' ? Calendar : Clock;

    return (
        <View style={styles.column}>
            <TouchableOpacity
                style={[styles.input, styles.pickerField, error ? styles.inputError : null]}
                onPress={() => setOpen(true)}
            >
                <Icon size={18} color="#447762" />
                <Text style={[styles.pickerText, !text && styles.pickerPlaceholder]}>
                    {text || (mode === 'date' ? 'Selecionar data' : 'Selecionar horário')}
                </Text>
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <DateTimePickerModal
                visible={open}
                mode={mode}
                title={mode === 'date' ? 'Selecione a data' : 'Selecione o horário'}
                value={text}
                minDate={minDate}
                maxDate={maxDate}
                onConfirm={(picked) => {
                    onChange(picked);
                    setOpen(false);
                }}
                onClear={() => {
                    onChange('');
                    setOpen(false);
                }}
                onCancel={() => setOpen(false)}
            />
        </View>
    );
}

function YesNoAnswer({ value, onChange }: InputProps) {
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
                    <Text style={[styles.choiceText, value === opt.val && styles.choiceTextSelected]}>{opt.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

function SingleChoiceAnswer({ question, value, onChange }: InputProps) {
    const options = [...(question.options ?? [])].sort((a, b) => a.order - b.order);
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
}

function MultipleChoiceAnswer({ question, value, onChange }: InputProps) {
    const options = [...(question.options ?? [])].sort((a, b) => a.order - b.order);
    const selectedIds = Array.isArray(value) ? value : [];
    const toggle = (id: number) => {
        onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
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

function ScaleAnswer({ value, onChange }: InputProps) {
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
}

function LocationAnswer({ value, onChange }: InputProps) {
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

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

// O tipo da questão (como veio no pacote) escolhe o desenhista. O tipo `SupportedQuestionType`
// vem de lib/questionTypes: se um tipo for acrescentado lá e faltar aqui, o TypeScript reclama.
const ANSWER_COMPONENTS: Record<SupportedQuestionType, React.ComponentType<InputProps>> = {
    FREE_TEXT: TextAnswer,
    NUMERIC: NumericAnswer,
    DATE: (props) => <PickerAnswer {...props} mode="date" />,
    TIME: (props) => <PickerAnswer {...props} mode="time" />,
    YES_NO: YesNoAnswer,
    SINGLE_CHOICE: SingleChoiceAnswer,
    MULTIPLE_CHOICE: MultipleChoiceAnswer,
    SCALE_1_5: ScaleAnswer,
    LOCATION: LocationAnswer,
};

// Tipos em que o erro só aparece depois que o pesquisador sai do campo (digitar "1" para chegar
// em "12" não pode gritar "mínimo 10" no meio do caminho). Seletores validam na hora de escolher.
const TYPED_TYPES = new Set<string>(['FREE_TEXT', 'NUMERIC']);

export default function QuestionInput({ question, value, onChange }: QuestionInputProps) {
    const [touched, setTouched] = useState(false);

    if (!isQuestionTypeSupported(question.type)) {
        return (
            <View style={styles.notice}>
                <Text style={styles.noticeText}>
                    Este tipo de questão ({question.type}) ainda não é suportado nesta versão do app. Pode avançar.
                </Text>
            </View>
        );
    }

    const Answer = ANSWER_COMPONENTS[question.type];
    const showError = !TYPED_TYPES.has(question.type) || touched;
    const error = showError ? validateAnswer(question, value) : null;

    return (
        <Answer
            question={question}
            value={value}
            onChange={onChange}
            error={error}
            onBlur={() => setTouched(true)}
        />
    );
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
    inputError: { borderColor: '#b91c1c' },
    multiline: { minHeight: 120 },
    pickerField: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pickerText: { fontSize: 16, color: '#18181b' },
    pickerPlaceholder: { color: '#a1a1aa' },
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
    counter: { fontSize: 13, color: '#71717a', textAlign: 'right' },
    counterLimit: { color: '#92400e', fontWeight: '600' },
    hint: { fontSize: 13, color: '#71717a' },
    errorText: { fontSize: 14, color: '#b91c1c' },
});
