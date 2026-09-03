'use client'

import BannerComponent from "@/components/ui/bannerComponent";

export default function EmpresaPage() {
    return (
        <>
            <section className="flex flex-col gap-5">

                <BannerComponent title="Dados das Empresa" />

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                </section>

            </section>
        </>
    );
}