import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getFreeSpaceBytes } from '@/lib/audioStorage';
import { spaceLevel, type SpaceLevel } from '@/lib/deviceSpace';
import { syncQueue } from '@/lib/syncQueue';

/** De quanto em quanto tempo o espaço livre é lido de novo enquanto o app está aberto. */
const REFRESH_MS = 30_000;

/**
 * Espaço livre do aparelho e o nível de aviso. Relê ao abrir, ao voltar para o app, a cada mudança do envio
 * (arquivo enviado = espaço livre) e de tempos em tempos (a gravação de uma entrevista vai enchendo o disco).
 */
export function useDeviceSpace(): { freeBytes: number | null; level: SpaceLevel } {
    const [freeBytes, setFreeBytes] = useState<number | null>(() => getFreeSpaceBytes());

    const refresh = useCallback(() => setFreeBytes(getFreeSpaceBytes()), []);

    useEffect(() => {
        const timer = setInterval(refresh, REFRESH_MS);
        const appState = AppState.addEventListener('change', (status) => {
            if (status === 'active') refresh();
        });
        const unsubscribeSync = syncQueue.subscribe(refresh);
        return () => {
            clearInterval(timer);
            appState.remove();
            unsubscribeSync();
        };
    }, [refresh]);

    return { freeBytes, level: spaceLevel(freeBytes) };
}
