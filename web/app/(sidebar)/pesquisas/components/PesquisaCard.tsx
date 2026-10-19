'use client'

import { Button } from "@/components/ui/button";
import { Contour } from "@/components/ui/contour";
import DialogLayout from "@/components/ui/dialogLayout";
import { avatarTone, formatPeriod, initialsOf, periodProgress } from "@/lib/fieldData";
import type { Research } from "@/lib/research";
import type { UserItem } from "@/lib/user";
import { ArrowUpRight, CalendarDays, Send, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { situationOf } from "../../(home)/components/PesquisasEquipeTabela";
import ModalEditarPesquisa from "./ModalEditarPesquisa";
import type { Research as EditableResearch } from "./TabelaPesquisas";

type PesquisaCardProps = {
    research: Research;
    team: UserItem[];
    collections: number;
    teamLoading?: boolean;
    now: number;
    onPublish: (id: number) => void;
    onDelete: (id: number) => void;
    onUpdated: (updated: Research) => void;
};

const SEGMENTS = 24;
const MAX_AVATARS = 4;

/** Um cartão por pesquisa: situação, período, andamento, equipe e as ações do dia a dia. */
export default function PesquisaCard({ research, team, collections, teamLoading = false, now, onPublish, onDelete, onUpdated }: PesquisaCardProps) {
    const situation = situationOf(research, now);
    const progress = periodProgress(research, now);
    const filled = Math.round(progress * SEGMENTS);
    const pct = Math.round(progress * 100);
    const isDraft = research.status === "DRAFT";
    const tone = isDraft ? "draft" : research.status === "CLOSED" ? "closed" : situation.endingSoon ? "soon" : "live";

    return (
        <article className={`pa-rc ${tone}`}>
            <Contour seed={research.id * 1.7} rings={7} cx={1} cy={0} size={1.1} width={360} height={200} />

            <header className="pa-rc-top">
                <span className={`pa-chip ${situation.tone}`}><i />{situation.label}</span>
                {research.recordInterview && <span className="pa-rc-tag" title="Esta pesquisa grava a entrevista em áudio">Áudio</span>}
            </header>

            <Link href={`/pesquisas/${research.id}`} className="pa-rc-title">
                <h3>{research.title}</h3>
                <ArrowUpRight aria-hidden="true" />
            </Link>
            <p className="pa-rc-desc">{research.objective || research.description || "Sem descrição."}</p>

            <div className="pa-rc-meta">
                <span><CalendarDays aria-hidden="true" />{formatPeriod(research.startDate, research.endDate, new Date(now))}</span>
                {research.targetAudience && <span title="Público-alvo"><Users aria-hidden="true" />{research.targetAudience}</span>}
            </div>

            <div className="pa-seg-wrap" role="img" aria-label={`${pct}% do período decorrido`}>
                <div className="pa-seg" aria-hidden="true">
                    {Array.from({ length: SEGMENTS }).map((_, i) => (
                        <i key={i} className={i < filled ? (tone === "soon" ? "c" : "f") : ""} />
                    ))}
                </div>
                <span className="pct">{pct}%</span>
            </div>

            <div className="pa-rc-foot">
                <div className="pa-rc-team">
                    {teamLoading ? (
                        <span className="pa-muted">–</span>
                    ) : team.length === 0 ? (
                        <span className="pa-muted">Sem equipe</span>
                    ) : (
                        <div className="pa-stack" title={team.map((u) => u.name).join(", ")}>
                            {team.slice(0, MAX_AVATARS).map((u) => (
                                <div key={u.id} className={`avatar-pa ${avatarTone(u.id)}`}>{initialsOf(u.name)}</div>
                            ))}
                            {team.length > MAX_AVATARS && <div className="avatar-pa more">+{team.length - MAX_AVATARS}</div>}
                        </div>
                    )}
                </div>
                {!isDraft && !teamLoading && (
                    <div className="pa-rc-count"><b>{collections}</b><span>{collections === 1 ? "coleta" : "coletas"}</span></div>
                )}
            </div>

            <div className="pa-rc-actions">
                <Link href={`/pesquisas/${research.id}`} className="pa-rc-open">Abrir</Link>
                <DialogLayout
                    triggerButtonVariant="outline"
                    triggerButtonSize="sm"
                    dialogTrigger="Editar"
                    dialogTitle={`Editar: ${research.title}`}
                    dialogDescription="Atualize as informações da pesquisa abaixo."
                    dialogContentClassName="min-h-200"
                    dialogContent={
                        <ModalEditarPesquisa
                            research={research as unknown as EditableResearch}
                            onSuccess={(updated) => onUpdated(updated as unknown as Research)}
                        />
                    }
                />
                {isDraft && (
                    <>
                        <Button size="sm" variant="secondary" onClick={() => onPublish(research.id)}><Send />Publicar</Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(research.id)} aria-label={`Excluir ${research.title}`}><Trash2 /></Button>
                    </>
                )}
            </div>
        </article>
    );
}
