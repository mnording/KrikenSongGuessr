import type { ReactNode } from 'react';
import { leaders } from '../engine/game';
import { isOnline, type Team } from '../game/types';

export function TeamDot({ color }: { color: string }) {
  return <span className="team-dot" style={{ background: color }} aria-hidden="true" />;
}

export function TeamName({ team, now }: { team: Team; now?: number }) {
  const online = now === undefined || isOnline(team, now);
  return (
    <span className="team-name">
      <TeamDot color={team.color} />
      {team.name}
      {!online && <span className="badge muted">offline</span>}
    </span>
  );
}

export function Scoreboard({ teams, target, winnerUids }: { teams: Team[]; target: number; winnerUids?: string[] }) {
  const sorted = [...teams].sort((a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0));
  const best = new Set(winnerUids ?? leaders(Object.fromEntries(teams.map((t) => [t.uid, t.timeline ?? []]))));
  return (
    <ol className="scoreboard">
      {sorted.map((team) => (
        <li key={team.uid} className={best.has(team.uid) ? 'winner' : undefined}>
          <TeamName team={team} />
          <span className="score">
            {team.timeline?.length ?? 0} / {target}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Screen({ title, children, actions }: { title?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <main className="screen">
      {title && <h1>{title}</h1>}
      {children}
      {actions && <div className="actions">{actions}</div>}
    </main>
  );
}

export function ErrorText({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return (
    <p className="error" role="alert">
      {error}
    </p>
  );
}

export function Loading({ text = 'Laddar…' }: { text?: string }) {
  return (
    <main className="screen">
      <p className="muted">{text}</p>
    </main>
  );
}

