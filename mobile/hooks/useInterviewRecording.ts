import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useCallback, useState } from 'react';
import type { CollectionAudio, InterviewConsent } from '@/lib/collectionUpload';

// Voz de entrevista: mono e 64 kbps bastam e mantêm o envio leve (~28 MB por hora).
// 'document' guarda o arquivo fora do cache, que o sistema pode limpar antes do envio.
const RECORDING_OPTIONS = { ...RecordingPresets.LOW_QUALITY, numberOfChannels: 1, directory: 'document' as const };

export type StartRecordingResult =
    | { ok: true; recording: boolean }
    | { ok: false; reason: 'consent-missing' | 'permission-denied' };

/**
 * Consentimento + gravação da entrevista, para a tela de coleta usar.
 *
 * Fluxo: se `needsConsent`, a tela mostra o ConsentModal e chama `confirmConsent()`;
 * só então `start()` libera a coleta e começa a gravar (em segundo plano, do início ao fim).
 * `finish()` para a gravação e devolve o aceite e o áudio para irem junto com as respostas.
 * Cada entrevista tem o seu consentimento: `finish()` e `reset()` o limpam.
 */
export function useInterviewRecording(pkg: { recordInterview?: boolean } | null | undefined) {
    const recorder = useAudioRecorder(RECORDING_OPTIONS);
    const needsConsent = pkg?.recordInterview === true;

    const [consent, setConsent] = useState<InterviewConsent | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    const confirmConsent = useCallback((): InterviewConsent => {
        const accepted: InterviewConsent = { accepted: true, acceptedAt: new Date().toISOString() };
        setConsent(accepted);
        return accepted;
    }, []);

    const start = useCallback(async (): Promise<StartRecordingResult> => {
        if (!needsConsent) return { ok: true, recording: false };

        // A trava vive aqui, e não só na tela: sem consentimento a coleta não começa.
        if (!consent) return { ok: false, reason: 'consent-missing' };

        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) return { ok: false, reason: 'permission-denied' };

        await setAudioModeAsync({ allowsRecording: true, allowsBackgroundRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);

        return { ok: true, recording: true };
    }, [needsConsent, consent, recorder]);

    const finish = useCallback(async (): Promise<{ consent?: InterviewConsent; audio?: CollectionAudio }> => {
        const result: { consent?: InterviewConsent; audio?: CollectionAudio } = { consent: consent ?? undefined };

        if (isRecording) {
            const before = recorder.getStatus().durationMillis ?? 0;
            await recorder.stop();
            const after = recorder.getStatus().durationMillis ?? 0;
            setIsRecording(false);
            await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => undefined);

            if (recorder.uri) {
                result.audio = {
                    uri: recorder.uri,
                    durationSeconds: Math.round(Math.max(before, after) / 1000),
                    mimeType: 'audio/mp4',
                };
            }
        }

        setConsent(null);
        return result;
    }, [consent, isRecording, recorder]);

    // Cancelou a coleta antes de terminar: descarta aceite e gravação em andamento.
    const reset = useCallback(async () => {
        if (isRecording) {
            await recorder.stop().catch(() => undefined);
            setIsRecording(false);
        }
        setConsent(null);
    }, [isRecording, recorder]);

    return { needsConsent, consent, isRecording, confirmConsent, start, finish, reset };
}
