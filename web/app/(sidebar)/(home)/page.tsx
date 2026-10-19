'use client'

import { useCurrentUser } from "@/hooks/useCurrentUser"
import SuperAdmPage from "./components/SuperAdmPage";
import AdmPage from "./components/AdmPage";

export default function Home() {
    const { user } = useCurrentUser();

    if (user?.profile === 'SUPERADMINISTRATOR') return <SuperAdmPage userName={user.name} />;
    if (user?.profile === 'ADMINISTRATOR') return <AdmPage userName={user.name} />;

    return null;
}
