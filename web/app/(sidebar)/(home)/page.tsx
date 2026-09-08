'use client'

import { useCurrentUser } from "@/hooks/useCurrentUser"
import SuperAdmPage from "./components/SuperAdmPage";
import AdmPage from "./components/AdmPage";



export default function Home() {
    const { user } = useCurrentUser();
    return (
        <>
            {user?.profile === 'SUPERADMINISTRATOR' && (
                <>
                    <SuperAdmPage></SuperAdmPage>
                </>
            )}
            {user?.profile === 'ADMINISTRATOR' && (
                <>
                    <AdmPage></AdmPage>
                </>
            )}
        </>
    );
}