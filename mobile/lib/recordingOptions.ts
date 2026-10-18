import { AudioQuality, IOSOutputFormat, type RecordingOptions } from 'expo-audio';

// Gravação de voz do app (entrevista e perguntas "responda falando"): AAC mono a 64 kbps em MP4 (.m4a),
// ~28 MB por hora, e toca em qualquer navegador.
// Opções explícitas de propósito: no Android o preset LOW_QUALITY grava 3GP com AMR-NB (.3gp), que o Chrome
// não reproduz e que não corresponde ao 'audio/mp4' enviado ao servidor.
export const VOICE_RECORDING_OPTIONS: RecordingOptions = {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
    android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
    ios: {
        outputFormat: IOSOutputFormat.MPEG4AAC,
        audioQuality: AudioQuality.MEDIUM,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
    // Obrigatório no tipo; o app só roda em Android e iOS.
    web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};
