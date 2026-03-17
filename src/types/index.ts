import { NbaPlayer, DraftRoomScoreResponse, TrajectoryResponse } from '../api/nba';

export type { NbaPlayer, DraftRoomScoreResponse, TrajectoryResponse };

export interface PlayerStats {
  pts: number;
  ast: number;
  reb: number;
}

export interface ComparisonPlayer {
  player: NbaPlayer;
  stats: any;
  draftScore: DraftRoomScoreResponse | null;
  trajectory: TrajectoryResponse | null;
  isLoading: boolean;
}

export interface TeamSlot {
  player: NbaPlayer;
  draftScore: DraftRoomScoreResponse;
  trajectory: TrajectoryResponse;
  stats: any;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  score: number | null;
  stats: PlayerStats | null;
  trend: 'up' | 'down' | 'stable' | null;
}

export interface SavedTeam {
  id: number;
  timestamp: number;
  slots: Record<string, TeamSlot | null>;
  scores: { teamScore: number; offRating: number; defRating: number };
  name?: string;
}

export const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-rose-400';
};

export const getScoreBg = (score: number) => {
  if (score >= 70) return 'bg-emerald-400/10 border-emerald-400/20';
  if (score >= 50) return 'bg-amber-400/10 border-amber-400/20';
  return 'bg-rose-400/10 border-rose-400/20';
};
