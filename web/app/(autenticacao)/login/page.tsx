'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth";
import { LockKeyhole, MapPin, User } from "lucide-react";
import Link from "next/link";
import { SubmitEventHandler, useState } from "react";
import { useRouter } from 'next/navigation';

export default function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const router = useRouter();

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        try {
            const data = await login(username, password);
            localStorage.setItem('access_token', data.access_token);
            router.push('/');
        } catch (error) {
            setError('Nome de usuário ou senha incorretos');
        }
    }

    return (
        <main className="relative flex items-center justify-center min-h-screen w-full p-4 bg-cover bg-center overflow-hidden">
            <div
                className="absolute -inset-8 bg-cover bg-center blur-[8px]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/backgroundGreen.jpeg')",
                }}
            />

            <div className="relative flex flex-col md:flex-row w-full max-w-225 min-h-125 bg-white rounded-2xl overflow-hidden shadow-2xl">

                <div
                    className="bg-[#124B52] hidden md:flex md:w-1/2 bg-cover bg-center flex-col items-center justify-center p-8 text-center relative bg-linear-to-br from-white/20 to-[#133135]"
                >
                    <MapPin
                        className="absolute left-1 top-2 opacity-10"
                        color="white"
                        size={30}
                    />

                    <div className="absolute inset-0 bg-black/30"></div>

                    <div className="relative z-10 text-white">
                        <Link
                            className="text-4xl font-bold mb-2 block hover:scale-105 transition-transform"
                            href="/"
                        >
                            Pesquise Aqui
                        </Link>

                        <h2 className="text-lg font-medium opacity-90">
                            Bem-Vindo de Volta!
                        </h2>
                    </div>
                </div>

                <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 lg:p-12 bg-white z-10 max-md:rounded-2xl">
                    <h1 className="text-3xl font-bold mb-8">
                        Login
                    </h1>

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-5 w-full max-w-[320px]"
                    >
                        <div className="relative w-full">
                            <User
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                size={20}
                            />

                            <Input
                                type="text"
                                placeholder="Nome do Usuário"
                                className="w-full pl-10 h-11"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                            <div className="relative w-full">
                                <LockKeyhole
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    size={20}
                                />

                                <Input
                                    type="password"
                                    placeholder="Senha"
                                    className="w-full pl-10 h-11"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Link
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                    href="#"
                                >
                                    Esqueceu a senha?
                                </Link>
                            </div>
                        </div>

                        {error && (
                            <span className="text-sm text-red-500 font-medium text-center">
                                {error}
                            </span>
                        )}

                        <Button
                            type="submit"
                            variant="default"
                            className="w-full h-11 text-base font-semibold mt-2 bg-[#133135] hover:bg-[#124b52f5]"
                        >
                            Entrar
                        </Button>

                        <hr className="w-full border-gray-200 my-2" />

                        <div className="flex flex-col gap-1 text-center text-sm">
                            <span className="text-gray-500">
                                Ainda Não Tem Acesso?
                            </span>

                            <Link
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                href="#"
                            >
                                Entre em Contato Com o Administrador
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}