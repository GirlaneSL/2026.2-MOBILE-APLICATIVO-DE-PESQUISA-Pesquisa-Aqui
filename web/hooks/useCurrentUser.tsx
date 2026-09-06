'use client'

import { AuthUser, getCurrentUser } from "@/lib/auth";
import { useEffect, useState } from "react";

export function useCurrentUser() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCurrentUser()
            .then(setUser)
            .finally(() => setLoading(false));
    }, []);

    return { user, loading };
}