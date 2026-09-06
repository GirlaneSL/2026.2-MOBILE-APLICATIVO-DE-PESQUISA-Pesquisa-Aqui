'use client'

import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

export type Profile = 'SUPERADMINISTRATOR' | 'ADMINISTRATOR' | 'RESEARCHER';

export interface CurrentUser {
    sub: number;
    name: string;
    username: string;
    profile: Profile;
    companyId?: number;
}

export function useCurrentUser() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');

        if (token) {
            try {
                const decoded = jwtDecode<CurrentUser>(token);
                setUser(decoded);
            } catch (error) {
                console.log('Invalid token');
            }
        }

        setLoading(false);
    }, []);

    return { user, loading };
}