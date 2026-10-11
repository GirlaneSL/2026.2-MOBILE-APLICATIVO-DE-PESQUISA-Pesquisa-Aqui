import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import type { CollectionAudio, CollectionInput, InterviewConsent } from './collectionUpload';
import { getDeviceId } from './researchCache';
import type { AnswerValue, Answers, PackageQuestion } from './displayRules';

// Coletas guardadas no aparelho (AsyncStorage): tudo aqui funciona sem internet.
// Uma chave por coleta, para que gravar uma resposta nunca reescreva as outras coletas.
const COLLECTION_PREFIX = 'collection_';

export type CollectionStatus = 'IN_PROGRESS' | 'FINISHED';

// OK: capturada | DENIED: pesquisador negou a permissão | UNAVAILABLE: GPS sem sinal/desligado
export type LocationStatus = 'OK' | 'DENIED' | 'UNAVAILABLE';

export interface StartLocation {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    capturedAt: string; // ISO 8601
}

export interface LocalCollection {
    // UUID gerado no aparelho: é ele que impede a duplicidade quando a coleta for enviada
    clientId: string;
    researchId: number;
    status: CollectionStatus;
    startedAt: string; // ISO 8601, gravado sozinho ao iniciar
    startLocation: StartLocation | null; // gravada sozinha ao iniciar; o app não tem tela para editá-la
    locationStatus: LocationStatus;
    finishedAt?: string; // ISO 8601, só existe depois de finalizar
    answers: Answers;
    currentQuestionId: number | null; // onde o pesquisador parou, para retomar do mesmo ponto
    consent?: InterviewConsent;
    audio?: CollectionAudio;
    updatedAt: string;
}

// Tipos que a tela de coleta ainda sabe preencher. Foto, várias fotos e áudio dependem de
// câmera/gravador por questão e ficam para uma próxima história.
export const SUPPORTED_QUESTION_TYPES = new Set([
    'FREE_TEXT',
    'NUMERIC',
    'DATE',
    'TIME',
    'YES_NO',
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'SCALE_1_5',
    'LOCATION',
]);

export class CollectionClosedError extends Error {
    constructor() {
        super('Esta coleta já foi finalizada e não pode mais ser editada.');
    }
}

const keyOf = (clientId: string) => `${COLLECTION_PREFIX}${clientId}`;

// ---------- Localização de início ----------

const LOCATION_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), ms);
        promise
            .then((value) => resolve(value))
            .catch(() => resolve(null))
            .finally(() => clearTimeout(timer));
    });
}

/**
 * Lê o GPS do aparelho (não precisa de internet, funciona em modo avião).
 * Nunca lança erro: se não der, devolve o motivo e a coleta segue mesmo assim.
 */
export async function captureStartLocation(): Promise<{ status: LocationStatus; location: StartLocation | null }> {
    try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
            permission = await Location.requestForegroundPermissionsAsync();
        }
        if (!permission.granted) return { status: 'DENIED', location: null };

        const position =
            (await withTimeout(
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                LOCATION_TIMEOUT_MS,
            )) ?? (await Location.getLastKnownPositionAsync().catch(() => null));

        if (!position) return { status: 'UNAVAILABLE', location: null };

        return {
            status: 'OK',
            location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy ?? null,
                capturedAt: new Date(position.timestamp).toISOString(),
            },
        };
    } catch {
        return { status: 'UNAVAILABLE', location: null };
    }
}

// ---------- Leitura e gravação ----------

async function readCollection(clientId: string): Promise<LocalCollection | null> {
    const json = await AsyncStorage.getItem(keyOf(clientId));
    return json ? (JSON.parse(json) as LocalCollection) : null;
}

/**
 * Grava a coleta no aparelho. Depois de finalizada ela fica fechada: qualquer gravação
 * que tente reabri-la ou alterá-la é recusada.
 */
export async function saveCollection(collection: LocalCollection): Promise<void> {
    const stored = await readCollection(collection.clientId);
    if (stored?.status === 'FINISHED') throw new CollectionClosedError();

    const next: LocalCollection = { ...collection, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(keyOf(collection.clientId), JSON.stringify(next));
}

export async function getCollection(clientId: string): Promise<LocalCollection | null> {
    return readCollection(clientId);
}

export async function listCollections(researchId?: number): Promise<LocalCollection[]> {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(COLLECTION_PREFIX));
    if (keys.length === 0) return [];

    const entries = await AsyncStorage.multiGet(keys);
    return entries
        .map(([, json]) => (json ? (JSON.parse(json) as LocalCollection) : null))
        .filter((c): c is LocalCollection => c !== null && (researchId === undefined || c.researchId === researchId))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Rascunhos (coletas começadas e não finalizadas) de uma pesquisa, o mais recente primeiro. */
export async function listDrafts(researchId: number): Promise<LocalCollection[]> {
    return (await listCollections(researchId)).filter((c) => c.status === 'IN_PROGRESS');
}

// ---------- Ciclo de vida da coleta ----------

/**
 * Inicia uma coleta: gera o UUID no aparelho, grava o horário de início e a localização.
 * O horário é o do toque em "iniciar"; a localização vem em seguida, sem o pesquisador fazer nada.
 */
export async function startCollection(researchId: number, consent?: InterviewConsent): Promise<LocalCollection> {
    const startedAt = new Date().toISOString();

    const collection: LocalCollection = {
        clientId: Crypto.randomUUID(),
        researchId,
        status: 'IN_PROGRESS',
        startedAt,
        startLocation: null,
        locationStatus: 'UNAVAILABLE',
        answers: {},
        currentQuestionId: null,
        consent,
        updatedAt: startedAt,
    };

    // Grava já com o horário: se o app fechar enquanto o GPS responde, o início não se perde.
    await saveCollection(collection);

    const { status, location } = await captureStartLocation();
    const withLocation: LocalCollection = { ...collection, startLocation: location, locationStatus: status };
    await saveCollection(withLocation);
    return withLocation;
}

/** Finaliza: grava o horário de término e fecha a coleta para edição. */
export async function finishCollection(
    collection: LocalCollection,
    extra: { consent?: InterviewConsent; audio?: CollectionAudio } = {},
): Promise<LocalCollection> {
    const finished: LocalCollection = {
        ...collection,
        ...extra,
        consent: extra.consent ?? collection.consent,
        status: 'FINISHED',
        finishedAt: new Date().toISOString(),
    };
    await saveCollection(finished);
    return finished;
}

export function getDurationSeconds(collection: Pick<LocalCollection, 'startedAt' | 'finishedAt'>): number | null {
    if (!collection.finishedAt) return null;
    const ms = new Date(collection.finishedAt).getTime() - new Date(collection.startedAt).getTime();
    return Math.max(0, Math.round(ms / 1000));
}

// ---------- Respostas ----------

/** Obrigatórias visíveis e ainda em branco, ignorando os tipos que o app ainda não preenche. */
export function getBlockingMissing(
    visibleQuestions: PackageQuestion[],
    answers: Answers,
    isAnswerEmpty: (answer: AnswerValue) => boolean,
): PackageQuestion[] {
    return visibleQuestions.filter(
        (q) => q.isRequired && SUPPORTED_QUESTION_TYPES.has(q.type) && isAnswerEmpty(answers[q.id]),
    );
}

function serializeAnswer(question: PackageQuestion, answer: AnswerValue): string | null {
    if (answer === null || answer === undefined) return null;

    if (question.type === 'YES_NO') return answer === true ? 'YES' : answer === false ? 'NO' : String(answer);
    if (question.type === 'DATE' && typeof answer === 'string') {
        const m = answer.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        return m ? `${m[3]}-${m[2]}-${m[1]}` : answer;
    }
    if (Array.isArray(answer)) return JSON.stringify(answer);
    return String(answer);
}

/** Monta o que o envio (collectionUpload) espera, a partir de uma coleta finalizada. */
export async function buildCollectionInput(
    collection: LocalCollection,
    questions: PackageQuestion[],
): Promise<CollectionInput> {
    if (collection.status !== 'FINISHED' || !collection.finishedAt) {
        throw new Error('Só coletas finalizadas podem ser enviadas.');
    }

    const answers = questions.flatMap((question) => {
        const value = serializeAnswer(question, collection.answers[question.id]);
        return value === null || value === '' ? [] : [{ questionId: question.id, value }];
    });

    return {
        researchId: collection.researchId,
        clientId: collection.clientId,
        deviceId: await getDeviceId(),
        startedAt: collection.startedAt,
        finishedAt: collection.finishedAt,
        answers,
        consent: collection.consent,
        audio: collection.audio,
    };
}
