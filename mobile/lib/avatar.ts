import { useEffect, useState } from 'react';
import { API_BASE_URL } from './api';
import { getToken } from './secureStorage';

/**
 * Cabeçalhos para baixar as imagens (foto de perfil, logo da empresa): a API só entrega imagem para quem está logado.
 * `null` enquanto o token ainda está sendo lido; depois, um objeto (vazio se não houver token).
 */
export function useImageHeaders(): Record<string, string> | null {
    const [headers, setHeaders] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        let cancelled = false;
        getToken()
            .then((token) => { if (!cancelled) setHeaders(token ? { Authorization: `Bearer ${token}` } : {}); })
            .catch(() => { if (!cancelled) setHeaders({}); });
        return () => { cancelled = true; };
    }, []);

    return headers;
}

/**
 * Endereço da imagem no tamanho pedido. A API devolve as imagens como caminhos dela (`/media/avatars/7?v=123`) e é ela
 * quem entrega, então o endereço do Cloudinary nunca aparece. `size` em pontos; pede o dobro para telas nítidas.
 * O recorte (rosto na foto, logo inteiro) a API decide pelo tipo da imagem.
 */
export function imageSrc(url: string, size: number): string {
    if (!url.startsWith('/media/')) return url;

    return `${API_BASE_URL}${url}${url.includes('?') ? '&' : '?'}w=${Math.round(size * 2)}`;
}

export const avatarSrc = imageSrc;
export const logoSrc = imageSrc;
