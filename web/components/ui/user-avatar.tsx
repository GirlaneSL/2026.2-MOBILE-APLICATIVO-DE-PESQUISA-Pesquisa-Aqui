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
 * Pede ao Cloudinary a imagem já no tamanho e no recorte desejados (formato e qualidade automáticos).
 * Endereços que não são do Cloudinary voltam como estão. `fill` recorta para preencher; `fit` mostra a imagem inteira.
 */
export function cloudinaryResize(
    url: string,
    { width, height = width, crop = "fill", gravity }: { width: number; height?: number; crop?: "fill" | "fit"; gravity?: string },
): string {
    const marker = "/image/upload/"
    const at = url.indexOf(marker)
    if (at === -1 || !url.includes("res.cloudinary.com")) return url

    const transformation = [`c_${crop}`, gravity ? `g_${gravity}` : "", `w_${Math.round(width)}`, `h_${Math.round(height)}`, "f_auto", "q_auto"]
        .filter(Boolean)
        .join(",")

    return `${url.slice(0, at + marker.length)}${transformation}/${url.slice(at + marker.length)}`
}

/** Foto de perfil no tamanho pedido (`size` em pixels de tela; pede o dobro para telas nítidas), recortada no rosto. */
export function avatarSrc(url: string, size: number): string {
    return cloudinaryResize(url, { width: size * 2, gravity: "face" })
}

/**
 * Foto do usuário (ou logo da empresa), ou as iniciais quando não há imagem (ou ela não carrega).
 * O formato e o tamanho vêm de `className`, então serve para o menu, o perfil e as listas.
 */
export function UserAvatar({
    name,
    src,
    size = 38,
    className = "",
    title,
    ariaHidden = false,
    fit = "cover",
}: {
    name: string
    src?: string | null
    /** Lado da imagem, em px, usado para pedir ao Cloudinary a imagem no tamanho certo. */
    size?: number
    className?: string
    title?: string
    /** Avatar decorativo (o nome já aparece ao lado): some para leitores de tela. */
    ariaHidden?: boolean
    /** `cover` preenche e recorta (fotos de pessoas); `contain` mostra a imagem inteira (logos). */
    fit?: "cover" | "contain"
}) {
    // Guarda qual endereço falhou: ao trocar a imagem o novo endereço volta a ser tentado.
    const [failed, setFailed] = useState<string | null>(null)
    const showImage = !!src && failed !== src
    const resized =
        src && fit === "contain" ? cloudinaryResize(src, { width: size * 2, crop: "fit" }) : src ? avatarSrc(src, size) : ""

    return (
        <div className={`${className} overflow-hidden`} title={title} aria-hidden={ariaHidden || undefined}>
            {showImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={resized}
                    alt=""
                    width={size}
                    height={size}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(src)}
                    className={`size-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
                />
            ) : (
                initialsOf(name)
            )}
        </div>
    )
}
