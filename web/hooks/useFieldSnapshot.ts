'use client'

import { isSessionExpiredError } from "@/lib/apiFetcher";
import { loadFieldSnapshot, type FieldSnapshot } from "@/lib/fieldData";
import { useEffect, useState } from "react";

const REFRESH_MS = 60_000;

/**
 * Dados de campo da empresa (coletas, equipe, vínculos), atualizados a cada minuto.
 * Com `enabled` falso não faz nenhuma consulta (por exemplo, para quem não é administrador).
 */
export function useFieldSnapshot(enabled = true) {
    const [snapshot, setSnapshot] = useState<FieldSnapshot | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        const refresh = () => {
            if (document.hidden) return;
            loadFieldSnapshot()
                .then((data) => {
                    if (cancelled) return;
                    setSnapshot(data);
                    setFailed(false);
                })
                .catch((error) => {
                    if (cancelled || isSessionExpiredError(error)) return;
                    console.error(error);
                    setFailed(true);
                });
        };

        refresh();
        const timer = window.setInterval(refresh, REFRESH_MS);
        document.addEventListener("visibilitychange", refresh);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [enabled]);

    return { snapshot, loading: enabled && !snapshot && !failed, failed };
}
