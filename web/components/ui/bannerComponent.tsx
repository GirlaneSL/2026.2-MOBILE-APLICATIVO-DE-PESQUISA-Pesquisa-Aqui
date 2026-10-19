type bannerProps = {
    title?: React.ReactNode;
    description?: React.ReactNode;
    /** Botões ou links alinhados à direita do título. */
    actions?: React.ReactNode;
};

/** Cabeçalho de página: título grande, uma linha de apoio e as ações da tela. */
export default function BannerComponent({ title, description, actions }: bannerProps) {
    return (
        <div className="pa-top introduction-card">
            <div className="min-w-0">
                <h1>{title}</h1>
                {description && <p>{description}</p>}
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
    );
}
