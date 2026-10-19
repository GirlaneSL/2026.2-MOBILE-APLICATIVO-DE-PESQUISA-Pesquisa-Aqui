/**
 * Identidade visual do Pesquisa Aqui: floresta, menta, verde e argila.
 * É a mesma paleta do painel web, para as duas telas parecerem o mesmo produto.
 */
export const Brand = {
    paper: '#f2f4f1',
    card: '#ffffff',
    ink: '#0f1713',
    muted: '#5d6a63',
    line: '#e0e5e1',

    forest: '#0a1410',
    forest2: '#111f19',
    mint: '#bfe3d0',
    green: '#447762',
    greenDeep: '#2e5546',
    clay: '#ab6049',
    clayInk: '#8a432f',
    clayLight: '#f3e0d9',

    chipLight: '#e4ece7',
    chipGray: '#ebeeeb',
    trackLight: '#e7ece8',

    fgDark: '#e9f0eb',
    mutedDark: '#8ea398',
    lineDark: 'rgba(191, 227, 208, 0.16)',

    warn: '#92400e',
    warnLight: '#fef3c7',
    danger: '#b4432e',
} as const;

export const Radius = {
    card: 24,
    hero: 34,
    pill: 999,
    input: 14,
} as const;

/** Espaço no fim das telas para a barra de abas flutuante não cobrir o conteúdo. */
export const TAB_BAR_CLEARANCE = 108;
