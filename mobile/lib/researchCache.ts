import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from "./api";

const RESEARCHES_CACHE_KEY = 'cached_researches';
const DEVICE_ID_KEY = 'device_id';

export interface Research {
    id: number;
    title: string;
    status: string;
    startDate: string;
    endDate: string;
    targetAudience: string;
    isDownloaded?: boolean;
}

// Gera ou recupera um ID único do dispositivo para controle de download
export async function getDeviceId(): Promise<string> {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!id) {
        id = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
    }
    return id;
}

export async function syncResearches(): Promise<void> {
    try {
        const response = await apiFetch('/research');
        if (!response.ok) return;

        const data: Research[] = await response.json();

        // Mantém a flag 'isDownloaded' para pesquisas que já estão no celular
        const currentCache = await getCachedResearches();
        const downloadedIds = new Set(currentCache.filter(r => r.isDownloaded).map(r => r.id));

        const mergedData = data.map(item => ({
            ...item,
            isDownloaded: downloadedIds.has(item.id)
        }));

        await AsyncStorage.setItem(RESEARCHES_CACHE_KEY, JSON.stringify(mergedData));
    } catch (error) {
        console.log('Sync de pesquisas falhou:', error);
    }
}

export async function getCachedResearches(): Promise<Research[]> {
    const json = await AsyncStorage.getItem(RESEARCHES_CACHE_KEY);
    if (!json) return [];

    const list: Research[] = JSON.parse(json);
    return list.filter((item) => item.status !== 'DRAFT');
}

export async function downloadResearchPackage(id: number): Promise<void> {
    const deviceId = await getDeviceId();

    // Identifica o aparelho no Header (ou poderia ser no body)
    const response = await apiFetch(`/research/${id}/download`, {
        headers: {
            'X-Device-ID': deviceId
        }
    });

    if (!response.ok) {
        throw new Error('Falha ao baixar pacote da pesquisa');
    }

    const fullPackage = await response.json();

    // GRAVAÇÃO ATÔMICA: Salva o pacote completo primeiro
    await AsyncStorage.setItem(`research_pkg_${id}`, JSON.stringify(fullPackage));

    // Só marca como baixada se a gravação do pacote der 100% certo
    const list = await getCachedResearches();
    const updatedList = list.map(r => r.id === id ? { ...r, isDownloaded: true } : r);
    await AsyncStorage.setItem(RESEARCHES_CACHE_KEY, JSON.stringify(updatedList));
}

export async function clearResearchesCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const researchKeys = keys.filter(k => k.startsWith('research_pkg_') || k === RESEARCHES_CACHE_KEY);
    if (researchKeys.length > 0) {
        await AsyncStorage.multiRemove(researchKeys);
    }
}