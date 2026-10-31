/**
 * Endereço da foto de perfil no tamanho pedido: o Cloudinary entrega a imagem já recortada e leve
 * (`c_fill`, formato e qualidade automáticos). `size` em pontos; pede o dobro para telas nítidas.
 */
export function avatarSrc(url: string, size: number): string {
    const marker = '/image/upload/';
    const at = url.indexOf(marker);
    if (at === -1 || !url.includes('res.cloudinary.com')) return url;

    const px = Math.round(size * 2);
    return `${url.slice(0, at + marker.length)}c_fill,g_face,w_${px},h_${px},f_auto,q_auto/${url.slice(at + marker.length)}`;
}
