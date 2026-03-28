import { DraftRoomScoreResponse, TrajectoryResponse, ComputedStats } from '../api/nba';
import { NbaPlayer } from '../api/nba';

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  score: number | null;
  stats: { pts: number; ast: number; reb: number } | null;
  trend: 'up' | 'down' | 'stable' | null;
}

export interface PlayerInfo {
  DISPLAY_FIRST_LAST: string;
  POSITION: string;
  TEAM_ABBREVIATION: string;
  HEIGHT: string;
  WEIGHT: string;
  COUNTRY: string;
  DRAFT_YEAR: string;
  DRAFT_ROUND: string;
  DRAFT_NUMBER: string;
}

export interface PlayerHeadline {
  PTS: number;
  AST: number;
  REB: number;
  PIE: number;
}

export interface GameLog {
  GAME_DATE: string;
  MATCHUP: string;
  WL: string;
  MIN: number;
  PTS: number;
  AST: number;
  REB: number;
  STL: number;
  BLK: number;
  TOV: number;
  FGM: number;
  FGA: number;
  FG3M: number;
  FG3A: number;
  FTM: number;
  FTA: number;
  PLUS_MINUS: number;
}

export interface DraftRoomScore {
  player_id: number;
  draftroom_score: number;
  components: {
    ts_rel_score: number;
    play_score: number;
    def_score: number;
    ftr_score: number;
    vol_eff_score: number;
  };
  games_sampled: number;
  season: string;
}

export interface TeamSlot {
  player: NbaPlayer;
  draftScore: DraftRoomScoreResponse;
  trajectory: TrajectoryResponse;
  stats: ComputedStats;
}

export interface SavedTeam {
  id: number;
  name: string;
  timestamp: number;
  slots: Record<string, TeamSlot | null>;
  scores: {
    teamScore: number;
    offRating: number;
    defRating: number;
  };
}

export interface ComparisonPlayer {
  player: NbaPlayer;
  stats: ComputedStats | null;
  draftScore: DraftRoomScoreResponse | null;
  trajectory: TrajectoryResponse | null;
  isLoading: boolean;
}

export const MVP_WINNERS = new Set([
  203999,  // Nikola Jokic
  2544,    // LeBron James
  201939,  // Stephen Curry
  1628983, // Shai Gilgeous-Alexander
  203507,  // Giannis Antetokounmpo
  1628384, // Jayson Tatum
  201142,  // Kevin Durant
  201565,  // Derrick Rose
  959,     // Steve Nash
  1717,    // Dirk Nowitzki
  947,     // Allen Iverson
  977,     // Kobe Bryant
  1495,    // Tim Duncan
  406,     // Shaquille O'Neal
  252,     // Karl Malone
  77142,   // Magic Johnson
  1449,    // Larry Bird
  787,     // Charles Barkley
  764,     // David Robinson
  201935,  // James Harden
  201566,  // Russell Westbrook
]);

export const ALL_NBA_3X = new Set([
  1629029, 101108, 1894, 76003, 893, 1630162,
  202681, 203954, 203076, 202695, 200755,
  203081, 1627783, 203468, 201950, 202326,
  203497, 1626157, 1627742, 2738, 2285, 2548
]);

export const getCareerTier = (playerId: number | string): 'Elite' | 'Star' | null => {
  const id = typeof playerId === 'string' ? parseInt(playerId, 10) : playerId;
  if (isNaN(id)) return null;
  if (MVP_WINNERS.has(id)) return 'Elite';
  if (ALL_NBA_3X.has(id)) return 'Star';
  return null;
};

export const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 80) return 'text-emerald-300';
  if (score >= 70) return 'text-lime-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-400';
};

export const getScoreBg = (score: number) => {
  if (score >= 90) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 70) return 'bg-lime-500/10 border-lime-500/20';
  if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
  if (score >= 50) return 'bg-orange-500/10 border-orange-500/20';
  return 'bg-red-500/10 border-red-500/20';
};