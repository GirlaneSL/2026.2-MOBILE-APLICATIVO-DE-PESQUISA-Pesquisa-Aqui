'use client'

import { BrandMark, Contour, Pin } from "@/components/ui/contour";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { login } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { SubmitEventHandler, useState } from "react";

export default function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const router = useRouter();

    const [isLoadingLogin, setIsLoadingLogin] = useState(false)
    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();

        setError(null);
        setIsLoadingLogin(true);

        try {
            await login(username, password);
            router.push('/');
        } catch {
            setError('Nome de usuário ou senha incorretos, ou empresa inativa.')
        } finally {
            setIsLoadingLogin(false)
        }
    }

    return (
        <main className="pa-login">
            <Contour seed={2.4} rings={16} cx={0.62} cy={0.55} size={1.15} width={1400} height={800} />
            <Pin label="Recife" left="45%" top="15%" delay="0s" />
            <Pin label="Caruaru" left="44%" top="78%" tone="clay" delay="1.1s" />

            <section className="pa-login-copy">
                <Link href="/" className="pa-brand">
                    <BrandMark color="#bfe3d0" />
                    Pesquisa Aqui
                </Link>
                <div>
                    <h1>Cada resposta no lugar certo.</h1>
                    <p className="lead">
                        Monte questionários, acompanhe as coletas em campo e consulte os resultados em um só painel.
                    </p>
                </div>
                <span aria-hidden="true" />
            </section>

            <section className="pa-login-card">
                <form onSubmit={handleSubmit} noValidate>
                    <h2>Entrar</h2>
                    <p className="sub">Use o usuário e a senha fornecidos pela sua empresa.</p>

                    <div className="pa-field">
                        <label htmlFor="username">Usuário</label>
                        <Input
                            id="username"
                            type="text"
                            autoComplete="username"
                            placeholder="nome.sobrenome"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="pa-field">
                        <label htmlFor="password">Senha</label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div style={{ textAlign: 'right', margin: '-4px 0 18px' }}>
                        <Link className="pa-link" href="#">Esqueceu a senha?</Link>
                    </div>

                    {error && (
                        <p role="alert" className="mb-4 rounded-xl bg-[#f3e0d9] px-3.5 py-2.5 text-[13px] font-medium text-[#8a432f]">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoadingLogin}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-medium text-white transition-colors hover:bg-[#26332c] active:translate-y-px disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
                    >
                        {isLoadingLogin ? (<><Spinner />Entrando...</>) : 'Entrar'}
                    </button>

                    <p className="mt-5 text-center text-[13px] text-muted-foreground">
                        Ainda não tem acesso?{' '}
                        <Link className="pa-link" href="#">Fale com o administrador</Link>
                    </p>
                </form>
            </section>
        </main>
    );
}
