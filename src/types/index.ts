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

export const MVP_WINNERS = new Set([
  203999, 2544, 201939, 1628983, 203507, 1628384, 201142, 101108,
  1894, 977, 1717, 893, 76003, 78497, 600017, 76375, 76743,
  1495, 887, 101150, 201566
]);

export const ALL_NBA_3X = new Set([
  1629029, 203999, 2544, 201939, 203507, 201142, 101108, 1894,
  76003, 893, 76375, 76743, 1495, 887, 1628384, 1630162,
  1628983, 202681, 203954, 101150, 203076, 202695, 200755,
  203081, 1627783, 203468, 201935, 201950, 202326,
  203497, 1626157, 1627742, 2738, 2285
]);

export const getCareerTier = (playerId: number | string): 'Elite' | 'Star' | null => {
  const id = typeof playerId === 'string' ? parseInt(playerId, 10) : playerId;
  if (isNaN(id)) return null;
  if (MVP_WINNERS.has(id)) return 'Elite';
  if (ALL_NBA_3X.has(id)) return 'Star';
  return null;
};
