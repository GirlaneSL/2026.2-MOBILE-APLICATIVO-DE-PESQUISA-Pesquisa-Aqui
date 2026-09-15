import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from "./api";

const RESEARCHES_CACHE_KEY = 'cached_researches';

export interface Research {
    id: number;
    title: string;
    status: string;
    startDate: string;
    endDate: string;
    targetAudience: string;
}

export async function syncResearches(): Promise<void> {
    try {
        const response = await apiFetch('/research');
        console.log('syncResearches status:', response.status);

        if (!response.ok) {
            console.log('syncResearches não ok, abortando');
            return;
        }

        const data: Research[] = await response.json();
        console.log('syncResearches dados recebidos:', data.length);
        await AsyncStorage.setItem(RESEARCHES_CACHE_KEY, JSON.stringify(data));
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

export async function clearResearchesCache(): Promise<void> {
    await AsyncStorage.removeItem(RESEARCHES_CACHE_KEY);
}
