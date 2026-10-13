import {
    RecordingPresets,
    requestNotificationPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
    type RecordingStatus,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import {
    ensureMicPermission,
    getFreeSpaceBytes,
    LOW_SPACE_BYTES,
    MIN_SPACE_TO_RECORD_BYTES,
} from '@/lib/audioStorage';
import type { CollectionAudio, InterviewConsent, RecordingIssue } from '@/lib/collectionUpload';

// Voz de entrevista: mono e 64 kbps bastam e mantêm o envio leve (~28 MB por hora).
// 'document' guarda o arquivo fora do cache, que o sistema pode limpar antes do envio.
const RECORDING_OPTIONS = { ...RecordingPresets.LOW_QUALITY, numberOfChannels: 1, directory: 'document' as const };

/** De quanto em quanto tempo o app confere se a gravação continua rodando. */
const WATCH_INTERVAL_MS = 2000;
/** Depois de quantas conferências seguidas sem o tempo andar a gravação conta como parada. */
const STALLED_CHECKS = 2;
/** Logo depois de iniciar/retomar o gravador ainda não reporta que está gravando. */
const START_GRACE_MS = 2500;

export type StartRecordingResult =
    | { ok: true; recording: boolean }
    | { ok: false; reason: 'consent-missing' | 'no-space' }
    // `canAskAgain: false` = só dá para liberar o microfone nas configurações do aparelho
    | { ok: false; reason: 'permission-denied'; canAskAgain: boolean };

export interface ActiveInterruption {
    at: string;
    message: string;
}

const INTERRUPTION_MESSAGES: Record<RecordingIssue['reason'], string> = {
    stopped:
        'A gravação parou — pode ter sido uma ligação, outro app usando o microfone ou o sistema encerrando a gravação. ' +
        'O que foi gravado até aqui está guardado.',
    error: 'O aparelho informou um erro na gravação. O que foi gravado até aqui está guardado.',
    'low-space': 'A gravação parou por falta de espaço no aparelho. Libere espaço e retome.',
};

/**
 * Consentimento + gravação da entrevista, para a tela de coleta usar.
 *
 * Fluxo: se `needsConsent`, a tela mostra o ConsentModal e chama `confirmConsent()`;
 * só então `start()` libera a coleta e começa a gravar (em segundo plano, do início ao fim).
 * `finish()` para a gravação e devolve o aceite, o áudio e as interrupções para irem junto com as respostas.
 * Cada entrevista tem o seu consentimento: `finish()` e `reset()` o limpam.
 *
 * Gravação interrompida (ligação, falta de espaço, erro): o hook percebe, expõe `interruption`
 * para a tela avisar o pesquisador e registra o momento. O app nunca finge que está gravando.
 */
export function useInterviewRecording(pkg: { recordInterview?: boolean } | null | undefined) {
    const onStatusRef = useRef<(status: RecordingStatus) => void>(() => undefined);
    const recorder = useAudioRecorder(RECORDING_OPTIONS, (status) => onStatusRef.current(status));
    const recorderState = useAudioRecorderState(recorder, 1000);
    const needsConsent = pkg?.recordInterview === true;

    const [consent, setConsent] = useState<InterviewConsent | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [interruption, setInterruption] = useState<ActiveInterruption | null>(null);
    const [issues, setIssues] = useState<RecordingIssue[]>([]);
    const [lowSpace, setLowSpace] = useState(false);
    const [pausedForAnswer, setPausedForAnswer] = useState(false);
    const [backgroundEnabled, setBackgroundEnabled] = useState(true);

    // Espelhos em ref: o vigia roda num intervalo e precisa do valor de agora, não do da renderização.
    const expectingRef = useRef(false); // deveria estar gravando neste instante
    const interruptionRef = useRef<ActiveInterruption | null>(null);
    const issuesRef = useRef<RecordingIssue[]>([]);
    const graceUntilRef = useRef(0);
    const lastDurationRef = useRef(0);
    const stalledRef = useRef(0);
    const lowSpaceWarnedRef = useRef(false);
    const pausedRef = useRef(false); // pausada de propósito, para a resposta por voz

    const confirmConsent = useCallback((): InterviewConsent => {
        const accepted: InterviewConsent = { accepted: true, acceptedAt: new Date().toISOString() };
        setConsent(accepted);
        return accepted;
    }, []);

    // ---------- Interrupções ----------

    const reportInterruption = useCallback((reason: RecordingIssue['reason']) => {
        if (interruptionRef.current) return; // já avisado: não repete o alerta

        const at = new Date().toISOString();
        const active: ActiveInterruption = { at, message: INTERRUPTION_MESSAGES[reason] };
        interruptionRef.current = active;
        issuesRef.current = [...issuesRef.current, { at, reason }];
        setInterruption(active);
        setIssues(issuesRef.current);

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        Alert.alert('Gravação interrompida', `${active.message}\n\nToque em "Retomar gravação" na tela da coleta.`);
    }, []);

    useEffect(() => {
        // O sistema avisa erro de gravação (ex.: disco cheio) por aqui.
        onStatusRef.current = (status) => {
            if (!expectingRef.current) return;
            if (status.hasError) {
                const noSpace = /space|enospc|storage/i.test(status.error ?? '');
                reportInterruption(noSpace ? 'low-space' : 'error');
            }
        };
    }, [reportInterruption]);

    const checkRecording = useCallback(() => {
        if (!expectingRef.current) return;

        const free = getFreeSpaceBytes();
        if (free !== null && free < LOW_SPACE_BYTES) {
            setLowSpace(true);
            if (!lowSpaceWarnedRef.current) {
                lowSpaceWarnedRef.current = true;
                Alert.alert(
                    'Pouco espaço no aparelho',
                    'O espaço livre está acabando e a gravação da entrevista pode parar. Libere espaço agora.',
                );
            }
        } else {
            setLowSpace(false);
        }

        if (Date.now() < graceUntilRef.current) return;

        const status = recorder.getStatus();
        if (!status.isRecording) {
            reportInterruption(free !== null && free < MIN_SPACE_TO_RECORD_BYTES ? 'low-space' : 'stopped');
            return;
        }

        // Diz que grava, mas o tempo não anda: o microfone foi tomado (ligação) sem o gravador parar.
        if (status.durationMillis <= lastDurationRef.current) {
            stalledRef.current += 1;
            if (stalledRef.current >= STALLED_CHECKS) reportInterruption('stopped');
        } else {
            stalledRef.current = 0;
        }
        lastDurationRef.current = status.durationMillis;
    }, [recorder, reportInterruption]);

    // Vigia enquanto a entrevista é gravada, e confere assim que o app volta para a frente
    // (tela desbloqueada, ligação encerrada, voltou de outro app).
    useEffect(() => {
        if (!isRecording) return;
        const timer = setInterval(checkRecording, WATCH_INTERVAL_MS);
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') checkRecording();
        });
        return () => {
            clearInterval(timer);
            subscription.remove();
        };
    }, [isRecording, checkRecording]);

    // ---------- Início ----------

    const start = useCallback(async (): Promise<StartRecordingResult> => {
        if (!needsConsent) return { ok: true, recording: false };

        // A trava vive aqui, e não só na tela: sem consentimento a coleta não começa.
        if (!consent) return { ok: false, reason: 'consent-missing' };

        const permission = await ensureMicPermission();
        if (!permission.granted) {
            return { ok: false, reason: 'permission-denied', canAskAgain: permission.canAskAgain };
        }

        const free = getFreeSpaceBytes();
        if (free !== null && free < MIN_SPACE_TO_RECORD_BYTES) return { ok: false, reason: 'no-space' };

        // Android 13+: gravar em segundo plano mostra uma notificação e exige POST_NOTIFICATIONS.
        // Se o pesquisador negar, grava só com o app aberto em vez de travar a coleta — e a tela avisa.
        let allowsBackgroundRecording = false;
        try {
            const notifications = await requestNotificationPermissionsAsync();
            allowsBackgroundRecording = notifications.granted;
        } catch {
            allowsBackgroundRecording = false;
        }

        await setAudioModeAsync({ allowsRecording: true, allowsBackgroundRecording, playsInSilentMode: true });
        try {
            await recorder.prepareToRecordAsync();
        } catch (error) {
            // O serviço de gravação em segundo plano não subiu (ex.: build instalado sem o plugin do
            // expo-audio atualizado). Não trava a entrevista: tenta de novo gravando só com o app aberto.
            if (!allowsBackgroundRecording) throw error;
            console.log('Gravação em segundo plano indisponível, gravando só em primeiro plano:', error);
            allowsBackgroundRecording = false;
            await setAudioModeAsync({ allowsRecording: true, allowsBackgroundRecording: false, playsInSilentMode: true });
            await recorder.prepareToRecordAsync();
        }

        issuesRef.current = [];
        interruptionRef.current = null;
        lowSpaceWarnedRef.current = false;
        lastDurationRef.current = 0;
        stalledRef.current = 0;
        graceUntilRef.current = Date.now() + START_GRACE_MS;
        setIssues([]);
        setInterruption(null);
        setLowSpace(false);
        setBackgroundEnabled(allowsBackgroundRecording);

        recorder.record();
        expectingRef.current = true;
        setIsRecording(true);

        return { ok: true, recording: true };
    }, [needsConsent, consent, recorder]);

    // ---------- Retomar ----------

    /** Tenta continuar a gravação parada. Devolve true se voltou a gravar. */
    const resume = useCallback(async (): Promise<boolean> => {
        const free = getFreeSpaceBytes();
        if (free !== null && free < MIN_SPACE_TO_RECORD_BYTES) {
            Alert.alert('Sem espaço', 'Libere espaço no aparelho para a gravação continuar.');
            return false;
        }

        try {
            recorder.record();
        } catch (error) {
            console.log('Falha ao retomar a gravação:', error);
        }
        graceUntilRef.current = Date.now() + START_GRACE_MS;
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (!recorder.getStatus().isRecording) {
            Alert.alert(
                'Não foi possível retomar',
                'O aparelho não liberou o microfone. Se houver uma ligação ou outro app gravando, encerre-o e tente de novo.',
            );
            return false;
        }

        const resumedAt = new Date().toISOString();
        issuesRef.current = issuesRef.current.map((issue, index, all) =>
            index === all.length - 1 && !issue.resumedAt ? { ...issue, resumedAt } : issue,
        );
        setIssues(issuesRef.current);
        interruptionRef.current = null;
        setInterruption(null);
        stalledRef.current = 0;
        lastDurationRef.current = recorder.getStatus().durationMillis;
        expectingRef.current = true;
        return true;
    }, [recorder]);

    // ---------- Pausa para a resposta por voz ----------

    // O microfone atende uma gravação por vez: enquanto o pesquisador grava a resposta de uma
    // questão de áudio, a gravação da entrevista fica em pausa e volta sozinha ao terminar.
    // A fala dessa resposta fica guardada no áudio da própria questão.
    const pauseForAnswer = useCallback(async () => {
        if (!expectingRef.current || interruptionRef.current) return;
        expectingRef.current = false; // pausa pedida pelo app não é interrupção
        try {
            recorder.pause();
            pausedRef.current = true;
            setPausedForAnswer(true);
        } catch (error) {
            console.log('Falha ao pausar a gravação da entrevista:', error);
            expectingRef.current = true;
        }
    }, [recorder]);

    const resumeAfterAnswer = useCallback(async () => {
        if (!pausedRef.current) return;
        pausedRef.current = false;
        setPausedForAnswer(false);
        if (!isRecording || interruptionRef.current) return;
        try {
            recorder.record();
        } catch (error) {
            console.log('Falha ao retomar a gravação da entrevista:', error);
        }
        graceUntilRef.current = Date.now() + START_GRACE_MS;
        stalledRef.current = 0;
        lastDurationRef.current = 0;
        expectingRef.current = true;
        // Não voltou? O vigia percebe e avisa; não fica em silêncio.
    }, [isRecording, recorder]);

    // ---------- Fim ----------

    const finish = useCallback(async (): Promise<{
        consent?: InterviewConsent;
        audio?: CollectionAudio;
        recordingIssues?: RecordingIssue[];
    }> => {
        const result: { consent?: InterviewConsent; audio?: CollectionAudio; recordingIssues?: RecordingIssue[] } = {
            consent: consent ?? undefined,
        };

        if (isRecording) {
            expectingRef.current = false;
            pausedRef.current = false;
            const before = recorder.getStatus().durationMillis ?? 0;
            try {
                await recorder.stop();
            } catch (error) {
                // Gravador em estado de erro: o arquivo até o ponto da falha ainda pode existir
                console.log('Falha ao parar a gravação:', error);
            }
            const after = recorder.getStatus().durationMillis ?? 0;
            setIsRecording(false);
            setPausedForAnswer(false);
            await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => undefined);

            if (issuesRef.current.length > 0) result.recordingIssues = issuesRef.current;

            if (recorder.uri) {
                result.audio = {
                    uri: recorder.uri,
                    durationSeconds: Math.round(Math.max(before, after) / 1000),
                    mimeType: 'audio/mp4',
                    hasGaps: issuesRef.current.length > 0 || undefined,
                };
            }
        }

        interruptionRef.current = null;
        setInterruption(null);
        setConsent(null);
        return result;
    }, [consent, isRecording, recorder]);

    // Cancelou a coleta antes de terminar: descarta aceite e gravação em andamento.
    const reset = useCallback(async () => {
        expectingRef.current = false;
        pausedRef.current = false;
        if (isRecording) {
            await recorder.stop().catch(() => undefined);
            setIsRecording(false);
            setPausedForAnswer(false);
            try {
                if (recorder.uri) {
                    const file = new File(recorder.uri);
                    if (file.exists) file.delete();
                }
            } catch {
                // arquivo que já sumiu não atrapalha
            }
        }
        interruptionRef.current = null;
        setInterruption(null);
        setConsent(null);
    }, [isRecording, recorder]);

    return {
        needsConsent,
        consent,
        isRecording,
        /** Segundos já gravados da entrevista (atualiza a cada segundo). */
        elapsedSeconds: Math.floor((recorderState.durationMillis ?? 0) / 1000),
        /** Gravação que parou sem o pesquisador pedir; null quando está tudo bem. */
        interruption,
        interruptions: issues,
        lowSpace,
        pausedForAnswer,
        /** false = sem permissão de notificações: a gravação só continua com o app aberto. */
        backgroundEnabled,
        confirmConsent,
        start,
        resume,
        pauseForAnswer,
        resumeAfterAnswer,
        finish,
        reset,
    };
}
