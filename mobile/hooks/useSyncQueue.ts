import NetInfo from '@react-native-community/netinfo';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { isNetworkReachable, syncQueue } from '@/lib/syncQueue';
import type { SyncState } from '@/lib/syncEngine';

/** Andamento do envio (rodando, qual coleta, quantas já foram). Atualiza a tela a cada mudança. */
export function useSyncState(): SyncState {
    return useSyncExternalStore(syncQueue.subscribe, syncQueue.getState, syncQueue.getState);
}

/** De quanto em quanto tempo o app tenta de novo, sozinho, o que falhou por motivo temporário. */
const AUTO_SEND_INTERVAL_MS = 60_000;

/**
 * Envio automático: tenta enviar a fila quando o aparelho pega rede, quando o app volta para a frente
 * e de tempos em tempos. Fica no layout do app logado, então vale para todas as telas.
 */
export function useAutoSync(): void {
    useEffect(() => {
        let online = false;

        const trySend = () => {
            if (online) void syncQueue.run({ trigger: 'auto' });
        };

        // O NetInfo avisa o estado atual ao se inscrever e depois a cada mudança
        const unsubscribeNet = NetInfo.addEventListener((state) => {
            const gotConnection = isNetworkReachable(state) && !online;
            online = isNetworkReachable(state);
            if (gotConnection) trySend();
        });

        const appStateSubscription = AppState.addEventListener('change', (status) => {
            if (status === 'active') trySend();
        });

        const timer = setInterval(trySend, AUTO_SEND_INTERVAL_MS);

        return () => {
            unsubscribeNet();
            appStateSubscription.remove();
            clearInterval(timer);
        };
    }, []);
}
