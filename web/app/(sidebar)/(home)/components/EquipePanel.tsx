import { avatarTone, initialsOf, type TeamRow } from "@/lib/fieldData";
import { formatRelativeTime } from "@/lib/dashboard";
import type { ReactNode } from "react";
import InfoCard from "./infoCards";

type EquipePanelProps = {
    rows: TeamRow[];
    now: number;
    loading?: boolean;
    /** A consulta das coletas falhou. */
    error?: boolean;
    icon?: ReactNode;
    cardClassName?: string;
};

/** Equipe da empresa: quem está em campo, quantas coletas fez hoje e quando coletou por último. */
export default function EquipePanel({ rows, now, loading = false, error = false, icon, cardClassName }: EquipePanelProps) {
    const active = rows.filter((r) => r.inField).length;

    return (
        <InfoCard
            cardClassName={cardClassName}
            icon={icon}
            cardTitle="Equipe em campo"
            cardDescription="Coletas feitas hoje"
            cardAction={!loading && !error && rows.length > 0 ? <span className="pa-chip light"><i />{active} {active === 1 ? "ativo" : "ativos"}</span> : undefined}
            CardContentClassName="max-h-[22rem] overflow-auto"
            cardContent={
                loading ? (
                    <div className="pa-empty" aria-busy="true">Carregando equipe...</div>
                ) : error ? (
                    <div className="pa-empty">Não foi possível carregar as coletas da equipe.</div>
                ) : rows.length === 0 ? (
                    <div className="pa-empty">Nenhum pesquisador cadastrado ainda.</div>
                ) : (
                    <ul className="pa-team">
                        {rows.map(({ user, collectionsToday, lastAt, inField }) => (
                            <li key={user.id}>
                                <div className={`avatar-pa ${avatarTone(user.id)}`} aria-hidden="true">{initialsOf(user.name)}</div>
                                <div className="who">
                                    <b title={user.name}>{user.name}</b>
                                    <span>
                                        {collectionsToday} {collectionsToday === 1 ? "coleta" : "coletas"}
                                        {lastAt ? ` · última ${formatRelativeTime(lastAt, now)}` : " · sem coletas ainda"}
                                    </span>
                                </div>
                                <div className={`st ${inField ? "" : "off"}`}>
                                    <i />{inField ? "Em campo" : "Offline"}
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            }
        />
    );
}
