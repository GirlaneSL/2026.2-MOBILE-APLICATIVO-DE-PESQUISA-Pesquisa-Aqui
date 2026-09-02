export default function Home() {
    return (
        <section className="relative h-screen">
            <div className="relative h-50 rounded-2xl overflow-hidden flex justify-center items-center shadow-lg">
                <div
                    className="absolute -inset-2 bg-cover bg-center bg-no-repeat blur-[4px]"
                    style={{
                        backgroundImage: "url('/backgroundGreen.jpeg')",
                        backgroundSize: "110%",
                    }}
                />

                <span className="relative z-10 text-white text-3xl">
                    Painel de Dados
                </span>

            </div>
        </section>
    );
}