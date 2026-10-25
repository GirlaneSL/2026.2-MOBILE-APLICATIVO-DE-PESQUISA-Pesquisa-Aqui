/**
 * Transição entre páginas do painel.
 * Diferente do layout, o template é recriado a cada navegação, então a
 * animação .pa-page (globals.css) toca de novo em cada troca de tela.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="pa-page">{children}</div>;
}
