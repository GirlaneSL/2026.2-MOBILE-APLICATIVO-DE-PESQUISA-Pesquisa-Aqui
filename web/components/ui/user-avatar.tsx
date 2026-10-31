'use client'

import { useState } from "react"

const initialsOf = (name: string) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "?"

/**
 * Endereço da foto no tamanho pedido: o Cloudinary entrega a imagem já recortada e leve
 * (`c_fill`, formato e qualidade automáticos). `size` em pixels de tela; pede o dobro para telas nítidas.
 */
export function avatarSrc(url: string, size: number): string {
    const marker = "/image/upload/"
    const at = url.indexOf(marker)
    if (at === -1 || !url.includes("res.cloudinary.com")) return url

    const px = Math.round(size * 2)
    return `${url.slice(0, at + marker.length)}c_fill,g_face,w_${px},h_${px},f_auto,q_auto/${url.slice(at + marker.length)}`
}

/**
 * Foto do usuário, ou as iniciais quando não há foto (ou ela não carrega).
 * O formato e o tamanho vêm de `className`, então serve para o menu, o perfil e as listas.
 */
export function UserAvatar({
    name,
    src,
    size = 38,
    className = "",
    title,
    ariaHidden = false,
}: {
    name: string
    src?: string | null
    /** Lado da imagem, em px, usado para pedir ao Cloudinary a foto no tamanho certo. */
    size?: number
    className?: string
    title?: string
    /** Avatar decorativo (o nome já aparece ao lado): some para leitores de tela. */
    ariaHidden?: boolean
}) {
    // Guarda qual endereço falhou: ao trocar a foto o novo endereço volta a ser tentado.
    const [failed, setFailed] = useState<string | null>(null)
    const showPhoto = !!src && failed !== src

    return (
        <div className={`${className} overflow-hidden`} title={title} aria-hidden={ariaHidden || undefined}>
            {showPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={avatarSrc(src, size)}
                    alt=""
                    width={size}
                    height={size}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(src)}
                    className="size-full object-cover"
                />
            ) : (
                initialsOf(name)
            )}
        </div>
    )
}
