import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, Star, ChevronRight, Loader2, X, Bookmark, AlertTriangle, RefreshCw } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { searchPlayers, getComputedAverages, NbaPlayer, getDraftRoomScore, DraftRoomScoreResponse, getTrajectory, TrajectoryResponse, getBatchScores, getPlayerInfo } from './api/nba';

interface PlayerStats {
  pts: number;
  ast: number;
  reb: number;
}

interface ComparisonPlayer {
  player: NbaPlayer;
  stats: any;
  draftScore: DraftRoomScoreResponse | null;
  trajectory: TrajectoryResponse | null;
  isLoading: boolean;
}

interface TeamSlot {
  player: NbaPlayer;
  draftScore: DraftRoomScoreResponse;
  trajectory: TrajectoryResponse;
  stats: any;
}

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  score: number | null;
  stats: PlayerStats | null;
  trend: 'up' | 'down' | 'stable' | null;
}

interface SavedTeam {
  id: number;
  timestamp: number;
  slots: Record<string, TeamSlot | null>;
  scores: { teamScore: number; offRating: number; defRating: number };
  name?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-rose-400';
};

const getScoreBg = (score: number) => {
  if (score >= 70) return 'bg-emerald-400/10 border-emerald-400/20';
  if (score >= 50) return 'bg-amber-400/10 border-amber-400/20';
  return 'bg-rose-400/10 border-rose-400/20';
};

const abbreviatePosition = (position: string): string => {
  if (!position) return '';
  if (position.length <= 2) return position;
  const map: Record<string, string> = {
    "Guard": "G",
    "Forward": "F",
    "Center": "C",
    "Point Guard": "PG",
    "Shooting Guard": "SG",
    "Small Forward": "SF",
    "Power Forward": "PF",
    "Forward-Guard": "F-G",
    "Guard-Forward": "G-F",
    "Forward-Center": "F-C",
    "Center-Forward": "C-F"
  };
  return map[position] || position;
};

const TrendIcon = ({ trend }: { trend: Player['trend'] }) => {
  if (!trend) return null;
  if (trend === 'up') return <TrendingUp className="w-5 h-5 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-5 h-5 text-rose-400" />;
  if (trend === 'stable') return <Minus className="w-5 h-5 text-slate-400" />;
  return null;
};

const PlayerCard = ({ player, isBreakout = false, onSelect, isBookmarked = false, onToggleBookmark, showBookmark = false }: { player: Player; isBreakout?: boolean; onSelect?: (player: Player) => void; isBookmarked?: boolean; onToggleBookmark?: (player: Player) => void; showBookmark?: boolean; key?: React.Key }) => {  return (
    <div className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
      isBreakout 
        ? 'bg-slate-900 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)] hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.1)]' 
        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-900/50'
    }`}>
      {isBreakout && (
        <div className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <Star className="w-3 h-3 fill-slate-950" />
          BREAKOUT
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <img 
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
            alt={player.name}
            className="w-12 h-12 rounded-lg object-cover bg-slate-800/50 flex-shrink-0"
            onError={(e) => e.currentTarget.style.display = 'none'}
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-100 truncate">{player.name}</h3>
              <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {abbreviatePosition(player.position)}
              </span>
            </div>
            <p className="text-sm text-slate-400 truncate">{player.team}</p>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 ml-2">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl border ${player.score ? getScoreBg(player.score) : 'bg-slate-800/50 border-slate-700'}`}>
            <span className={`text-xl font-bold ${player.score ? getScoreColor(player.score) : 'text-slate-500'}`}>{player.score ? player.score : '—'}</span>
          </div>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">DR Score</span>
        </div>
      </div>

      {player.stats ? (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
            <div className="text-xs text-slate-500 mb-1">PTS</div>
            <div className="text-lg font-semibold text-slate-200">{player.stats.pts.toFixed(1)}</div>
          </div>
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
            <div className="text-xs text-slate-500 mb-1">AST</div>
            <div className="text-lg font-semibold text-slate-200">{player.stats.ast.toFixed(1)}</div>
          </div>
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
            <div className="text-xs text-slate-500 mb-1">REB</div>
            <div className="text-lg font-semibold text-slate-200">{player.stats.reb.toFixed(1)}</div>
          </div>
        </div>
      ) : (
        <div className="mb-5">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="bg-slate-950/30 rounded-lg p-3 border border-slate-800/30">
              <div className="text-xs text-slate-600 mb-1">PTS</div>
              <div className="text-lg font-semibold text-slate-600">—</div>
            </div>
            <div className="bg-slate-950/30 rounded-lg p-3 border border-slate-800/30">
              <div className="text-xs text-slate-600 mb-1">AST</div>
              <div className="text-lg font-semibold text-slate-600">—</div>
            </div>
            <div className="bg-slate-950/30 rounded-lg p-3 border border-slate-800/30">
              <div className="text-xs text-slate-600 mb-1">REB</div>
              <div className="text-lg font-semibold text-slate-600">—</div>
            </div>
          </div>
          <div className="text-center text-xs text-slate-500">Click Load Analysis to reveal</div>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {player.trend && (
            <>
              <TrendIcon trend={player.trend} />
              <span className="text-sm font-medium text-slate-400">
                {player.trend === 'up' ? 'Trending Up' : player.trend === 'down' ? 'Trending Down' : 'Holding Steady'}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showBookmark && onToggleBookmark && (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(player); }}
              className={`transition-colors p-1.5 rounded-lg ${isBookmarked ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
            </button>
          )}
          <button 
            onClick={() => onSelect && onSelect(player)}
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-sm font-medium"
          >
            Load Analysis <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const getStatColor = (val: number | undefined, allVals: (number | undefined)[]) => {
  const validVals = allVals.filter((v): v is number => v !== undefined);
  if (validVals.length < 2 || val === undefined) return 'text-slate-200';
  
  const max = Math.max(...validVals);
  const min = Math.min(...validVals);
  
  if (val === max && max !== min) return 'text-emerald-400 font-bold';
  if (val === min && max !== min) return 'text-rose-400';
  return 'text-amber-400';
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable' | null) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-rose-400" />;
  if (trend === 'stable') return <Minus className="w-4 h-4 text-slate-400" />;
  return null;
};

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const typeState = useRef({ index: 0, text: '', isDeleting: false });

  const [searchResults, setSearchResults] = useState<NbaPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<NbaPlayer | null>(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [selectedPlayerDraftScore, setSelectedPlayerDraftScore] = useState<DraftRoomScoreResponse | null>(null);
  const [isLoadingDraftScore, setIsLoadingDraftScore] = useState(false);
  const [selectedPlayerTrajectory, setSelectedPlayerTrajectory] = useState<TrajectoryResponse | null>(null);
  const [isLoadingTrajectory, setIsLoadingTrajectory] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [breakoutPlayers, setBreakoutPlayers] = useState<Player[]>([]);
  const [isLoadingBatch, setIsLoadingBatch] = useState(true);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [selectedPosition, setSelectedPosition] = useState('All Positions');
  const [selectedSort, setSelectedSort] = useState('Highest Score');

  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonPlayers, setComparisonPlayers] = useState<ComparisonPlayer[]>([]);
  const [isAddingToComparison, setIsAddingToComparison] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState<NbaPlayer | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [watchlist, setWatchlist] = useState<Player[]>([]);

  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(true);

  const [teamBuilderMode, setTeamBuilderMode] = useState(false);
  const [teamSlots, setTeamSlots] = useState<Record<string, TeamSlot | null>>({
    PG: null,
    SG: null,
    SF: null,
    PF: null,
    C: null
  });
  const [currentSlot, setCurrentSlot] = useState<string>('PG');
  const [teamResult, setTeamResult] = useState<{ teamScore: number; offRating: number; defRating: number } | null>(null);
  const [mismatchWarning, setMismatchWarning] = useState<{ player: NbaPlayer; slot: string; data: TeamSlot } | null>(null);
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false);
  const [suppressPositionWarnings, setSuppressPositionWarnings] = useState(false);
  const [isTeamSaved, setIsTeamSaved] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [showTeamNameInput, setShowTeamNameInput] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [suppressTeamDeleteConfirm, setSuppressTeamDeleteConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('draftroom_saved_teams');
    if (stored) {
      try {
        setSavedTeams(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse saved teams from localStorage', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('draftroom_saved_teams', JSON.stringify(savedTeams));
  }, [savedTeams]);

  useEffect(() => {
    const stored = localStorage.getItem('draftroom_watchlist');
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse watchlist from localStorage', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('draftroom_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleBookmark = (player: Player) => {
    setWatchlist(prev => {
      if (prev.some(p => p.id === player.id)) {
        return prev.filter(p => p.id !== player.id);
      }
      return [...prev, player];
    });
  };

  const handleToggleBookmarkSelected = () => {
  if (!selectedPlayer) return;
  const playerObj: Player = {
    id: selectedPlayer.id.toString(),
    name: `${selectedPlayer.first_name} ${selectedPlayer.last_name}`,
    position: abbreviatePosition(selectedPlayer.position || ''),
    team: selectedPlayer.team.full_name,
    score: selectedPlayerDraftScore?.draftroom_score ?? null,
    stats: selectedPlayerStats ? {
      pts: selectedPlayerStats.pts ?? 0,
      ast: selectedPlayerStats.ast ?? 0,
      reb: selectedPlayerStats.reb ?? 0
    } : null,
    trend: selectedPlayerTrajectory?.DraftRoomScore?.trend ?? null
  };
  toggleBookmark(playerObj);
};

  const filteredAndSortedPlayers = useMemo(() => {
    let result = [...players];

    if (selectedPosition === 'Guards') {
      result = result.filter(p => p.position.includes('G') || p.position === 'PG' || p.position === 'SG');
    } else if (selectedPosition === 'Forwards') {
      result = result.filter(p => p.position.includes('F') || p.position === 'SF' || p.position === 'PF');
    } else if (selectedPosition === 'Centers') {
      result = result.filter(p => p.position === 'C');
    }

    if (selectedSort === 'Trending Up') {
      result = result.filter(p => p.trend === 'up');
    }

    result.sort((a, b) => {
      if (selectedSort === 'Highest Score' || selectedSort === 'Trending Up') {
        if (a.score === null && b.score === null) return 0;
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return b.score - a.score;
      } else if (selectedSort === 'Most Points') {
        const aPts = a.stats?.pts ?? null;
        const bPts = b.stats?.pts ?? null;
        if (aPts === null && bPts === null) return 0;
        if (aPts === null) return 1;
        if (bPts === null) return -1;
        return bPts - aPts;
      }
      return 0;
    });

    return result;
  }, [players, selectedPosition, selectedSort]);

  const placeholders = [
    'Search LeBron James...',
    'Search Nikola Jokic...',
    'Search Jayson Tatum...',
    'Search Luka Doncic...'
  ];

  const handleSelectPlayerCard = (player: Player) => {
    const nameParts = player.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    const nbaPlayer: NbaPlayer = {
      id: parseInt(player.id),
      first_name: firstName,
      last_name: lastName,
      position: player.position,
      team: { full_name: player.team }
    } as any;

    handlePlayerSelect(nbaPlayer);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const HARDCODED_TOP_PROSPECTS: Player[] = [
      { id: '203999', name: 'Nikola Jokic', position: 'C', team: 'DEN', score: null, stats: null, trend: null },
      { id: '1628983', name: 'Shai Gilgeous-Alexander', position: 'PG', team: 'OKC', score: null, stats: null, trend: null },
      { id: '1641705', name: 'Victor Wembanyama', position: 'C', team: 'SAS', score: null, stats: null, trend: null },
      { id: '203507', name: 'Giannis Antetokounmpo', position: 'PF', team: 'MIL', score: null, stats: null, trend: null },
      { id: '1629029', name: 'Luka Doncic', position: 'PG', team: 'DAL', score: null, stats: null, trend: null },
      { id: '1630162', name: 'Anthony Edwards', position: 'SG', team: 'MIN', score: null, stats: null, trend: null }
    ];

    const HARDCODED_BREAKOUT_ALERTS: Player[] = [
  { id: '1630567', name: 'Scottie Barnes', position: 'PF', team: 'TOR', score: null, stats: null, trend: null },
  { id: '1630552', name: 'Jalen Johnson', position: 'PF', team: 'ATL', score: null, stats: null, trend: null },
  { id: '1630596', name: 'Evan Mobley', position: 'PF', team: 'CLE', score: null, stats: null, trend: null }
];

    setPlayers(HARDCODED_TOP_PROSPECTS);
    setBreakoutPlayers(HARDCODED_BREAKOUT_ALERTS);
    setIsLoadingBatch(false);
  }, []);

  useEffect(() => {
    if (isFocused) {
      setPlaceholder('');
      typeState.current = { index: 0, text: '', isDeleting: false };
      return;
    }

    let timeout: NodeJS.Timeout;

    const type = () => {
      const state = typeState.current;
      const fullText = placeholders[state.index];

      if (state.isDeleting) {
        state.text = fullText.substring(0, state.text.length - 1);
      } else {
        state.text = fullText.substring(0, state.text.length + 1);
      }

      setPlaceholder(state.text);

      let typeSpeed = state.isDeleting ? 30 : 80;

      if (!state.isDeleting && state.text === fullText) {
        typeSpeed = 1500;
        state.isDeleting = true;
      } else if (state.isDeleting && state.text === '') {
        state.isDeleting = false;
        state.index = (state.index + 1) % placeholders.length;
        typeSpeed = 400;
      }

      timeout = setTimeout(type, typeSpeed);
    };

    timeout = setTimeout(type, 100);
    return () => clearTimeout(timeout);
  }, [isFocused]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (searchQuery.trim().length <= 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const results = await searchPlayers(searchQuery, controller.signal);
        setSearchResults(results);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
        const status = err?.response?.status || 'Unknown Status';
        console.error(`[searchPlayers] Failed with status ${status}:`, err);
        setSearchError(err instanceof Error ? err.message : 'An unknown error occurred');
        setSearchResults([]);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPlayer) {
      setIsLoadingStats(true);
      setIsLoadingDraftScore(true);
      setIsLoadingTrajectory(true);

      if (!selectedPlayer.position || selectedPlayer.team.full_name === 'NBA') {
        getPlayerInfo(selectedPlayer.id)
          .then(info => {
            if (info && info.CommonPlayerInfo && info.CommonPlayerInfo.length > 0) {
              const pInfo = info.CommonPlayerInfo[0];
              setSelectedPlayer(prev => prev ? { 
                ...prev, 
                position: pInfo.POSITION,
                team: { full_name: `${pInfo.TEAM_CITY} ${pInfo.TEAM_NAME}`.trim() }
              } : prev);
            }
          })
          .catch(err => console.error(err));
      }
      
      getComputedAverages(selectedPlayer.id)
        .then(stats => {
          setSelectedPlayerStats(stats);
          const updateStats = (pList: Player[]) => pList.map(p => p.id === selectedPlayer.id.toString() ? { ...p, stats: { pts: stats.pts || 0, ast: stats.ast || 0, reb: stats.reb || 0 } } : p);
          setPlayers(updateStats);
          setBreakoutPlayers(updateStats);
        })
        .catch((err: any) => {
          const status = err?.response?.status || 'Unknown Status';
          console.error(`[getComputedAverages] Failed with status ${status}:`, err);
          setSelectedPlayerStats(null);
        })
        .finally(() => {
          setIsLoadingStats(false);
        });

      getDraftRoomScore(selectedPlayer.id)
        .then(score => {
          setSelectedPlayerDraftScore(score);
          const updateScore = (pList: Player[]) => pList.map(p => p.id === selectedPlayer.id.toString() ? { ...p, score: score.draftroom_score } : p);
          setPlayers(updateScore);
          setBreakoutPlayers(updateScore);
        })
        .catch((err: any) => {
          const status = err?.response?.status || 'Unknown Status';
          console.error(`[getDraftRoomScore] Failed with status ${status}:`, err);
          setSelectedPlayerDraftScore(null);
        })
        .finally(() => {
          setIsLoadingDraftScore(false);
        });

      getTrajectory(selectedPlayer.id)
        .then(traj => {
          setSelectedPlayerTrajectory(traj);
          const updateTrend = (pList: Player[]) => pList.map(p => p.id === selectedPlayer.id.toString() ? { ...p, trend: traj.DraftRoomScore.trend } : p);
          setPlayers(updateTrend);
          setBreakoutPlayers(updateTrend);
        })
        .catch((err: any) => {
          const status = err?.response?.status || 'Unknown Status';
          console.error(`[getTrajectory] Failed with status ${status}:`, err);
          setSelectedPlayerTrajectory(null);
        })
        .finally(() => {
          setIsLoadingTrajectory(false);
        });
    } else {
      setSelectedPlayerStats(null);
      setSelectedPlayerDraftScore(null);
      setSelectedPlayerTrajectory(null);
    }
  }, [selectedPlayer]);

  const fetchComparisonData = async (player: NbaPlayer) => {
    let position = player.position;
    let team = player.team;
    
    if (!position || team.full_name === 'NBA') {
      try {
        const info = await getPlayerInfo(player.id);
        if (info && info.CommonPlayerInfo && info.CommonPlayerInfo.length > 0) {
          const pInfo = info.CommonPlayerInfo[0];
          position = pInfo.POSITION;
          team = { full_name: `${pInfo.TEAM_CITY} ${pInfo.TEAM_NAME}`.trim() };
        }
      } catch (err) {
        console.error(err);
      }
    }

    const updatedPlayer = { ...player, position, team };

    Promise.allSettled([
      getComputedAverages(player.id),
      getDraftRoomScore(player.id),
      getTrajectory(player.id)
    ]).then(([statsRes, scoreRes, trajRes]) => {
      setComparisonPlayers(prev => prev.map(p => {
        if (p.player.id === player.id) {
          return {
            player: updatedPlayer,
            stats: statsRes.status === 'fulfilled' ? statsRes.value : null,
            draftScore: scoreRes.status === 'fulfilled' ? scoreRes.value : null,
            trajectory: trajRes.status === 'fulfilled' ? trajRes.value : null,
            isLoading: false
          };
        }
        return p;
      }));
    });
  };

  const calculateTeamScore = (slots: Record<string, TeamSlot | null>) => {
    const pg = slots['PG'];
    const sg = slots['SG'];
    const sf = slots['SF'];
    const pf = slots['PF'];
    const c = slots['C'];
    
    if (!pg || !sg || !sf || !pf || !c) return;
    
    const teamScore = (
      pg.draftScore.draftroom_score * 1.15 +
      sg.draftScore.draftroom_score * 1.0 +
      sf.draftScore.draftroom_score * 1.0 +
      pf.draftScore.draftroom_score * 1.0 +
      c.draftScore.draftroom_score * 1.15
    ) / 5.3;
    
    const offRaw = (
      pg.trajectory.PTS.value * 1.2 +
      sg.trajectory.PTS.value * 1.1 +
      sf.trajectory.PTS.value * 1.0 +
      pf.trajectory.PTS.value * 0.9 +
      c.trajectory.PTS.value * 0.8
    ) / 5 + (
      pg.trajectory.AST.value * 1.3 +
      sg.trajectory.AST.value * 1.1 +
      sf.trajectory.AST.value * 0.9 +
      pf.trajectory.AST.value * 0.8 +
      c.trajectory.AST.value * 0.7
    ) / 5;
    
    const offRating = 100 + (offRaw / 45.0) * 30;
    
    const defRaw = (
      pg.stats.stl * 1.2 +
      sg.stats.stl * 1.1 +
      sf.stats.stl * 1.0 +
      pf.stats.stl * 1.0 +
      c.stats.stl * 0.8
    ) / 5 + (
      pg.stats.blk * 0.7 +
      sg.stats.blk * 0.8 +
      sf.stats.blk * 0.9 +
      pf.stats.blk * 1.1 +
      c.stats.blk * 1.3
    ) / 5 + (
      (pg.stats.reb + sg.stats.reb + sf.stats.reb + pf.stats.reb + c.stats.reb) / 5 * 0.3
    );
    
    const defRating = 125 - (defRaw / 8.0) * 25;
    
    setTeamResult({ teamScore, offRating, defRating });
  };

  const fillSlot = (slot: string, data: TeamSlot) => {
    setTeamSlots(prev => {
      const nextSlots = { ...prev, [slot]: data };
      setIsTeamSaved(false);
      setCurrentTeamId(null);
      setShowTeamNameInput(false);
      
      const slots = ['PG', 'SG', 'SF', 'PF', 'C'];
      const currentIndex = slots.indexOf(slot);
      let nextSlot = slot;
      for (let i = 1; i <= 5; i++) {
        const checkSlot = slots[(currentIndex + i) % 5];
        if (!nextSlots[checkSlot]) {
          nextSlot = checkSlot;
          break;
        }
      }
      setCurrentSlot(nextSlot);
      
      if (Object.values(nextSlots).every(s => s !== null)) {
        calculateTeamScore(nextSlots);
      }
      
      return nextSlots;
    });
    setMismatchWarning(null);
  };

  const handlePlayerSelect = (player: NbaPlayer, force: boolean = false) => {
    if (teamBuilderMode) {
      setSearchQuery('');
      setSearchResults([]);
      
      let position = player.position;
      let team = player.team;
      
      const fetchData = async () => {
        if (!position || team.full_name === 'NBA') {
          try {
            const info = await getPlayerInfo(player.id);
            if (info && info.CommonPlayerInfo && info.CommonPlayerInfo.length > 0) {
              const pInfo = info.CommonPlayerInfo[0];
              position = pInfo.POSITION;
              team = { full_name: `${pInfo.TEAM_CITY} ${pInfo.TEAM_NAME}`.trim() };
            }
          } catch (err) {
            console.error(err);
          }
        }
        
        const updatedPlayer = { ...player, position, team };
        
        const [draftScore, trajectory, stats] = await Promise.all([
          getDraftRoomScore(player.id),
          getTrajectory(player.id),
          getComputedAverages(player.id)
        ]);
        
        if (!draftScore || !trajectory || !stats) return;
        
        const slotData = { player: updatedPlayer, draftScore, trajectory, stats };
        
        const pos = updatedPlayer.position || '';
        let isMatch = false;
        if (currentSlot === 'PG' && (pos.includes('G') || pos === 'PG')) isMatch = true;
        else if (currentSlot === 'SG' && (pos.includes('G') || pos === 'SG')) isMatch = true;
        else if (currentSlot === 'SF' && (pos.includes('F') || pos === 'SF' || pos === 'F-C' || pos === 'C-F')) isMatch = true;
        else if (currentSlot === 'PF' && (pos.includes('F') || pos === 'PF' || pos === 'F-C' || pos === 'C-F')) isMatch = true;
        else if (currentSlot === 'C' && (pos.includes('C') || pos === 'C' || pos === 'F-C' || pos === 'C-F')) isMatch = true;
        
        if (!isMatch && !suppressPositionWarnings) {
          setMismatchWarning({ player: updatedPlayer, slot: currentSlot, data: slotData });
          setMismatchConfirmed(false);
        } else {
          fillSlot(currentSlot, slotData);
        }
      };
      fetchData();
      return;
    }

    if (!force && comparisonMode && comparisonPlayers.length > 1 && !isAddingToComparison) {
      setPendingPlayer(player);
      setSearchResults([]);
      return;
    }

    if (isAddingToComparison) {
      if (comparisonPlayers.length < 3 && !comparisonPlayers.some(p => p.player.id === player.id)) {
        setComparisonPlayers(prev => [
          ...prev,
          { player, stats: null, draftScore: null, trajectory: null, isLoading: true }
        ]);
        fetchComparisonData(player);
      }
      setIsAddingToComparison(false);
      setSearchQuery('');
    } else {
      setSelectedPlayer(player);
      setSearchQuery(`${player.first_name} ${player.last_name}`);
    }
    setSearchResults([]);
  };

  const handleResetApp = () => {
    setSearchQuery('');
    setSelectedPlayer(null);
    setComparisonMode(false);
    setComparisonPlayers([]);
    setIsAddingToComparison(false);
    setSearchResults([]);
    setTeamBuilderMode(false);
    setTeamSlots({ PG: null, SG: null, SF: null, PF: null, C: null });
    setCurrentSlot('PG');
    setTeamResult(null);
    setMismatchWarning(null);
    setIsTeamSaved(false);
    setCurrentTeamId(null);
    setShowTeamNameInput(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentPlaceholder = isFocused ? '' : (
    teamBuilderMode 
      ? `Search your ${currentSlot === 'PG' ? 'Point Guard' : currentSlot === 'SG' ? 'Shooting Guard' : currentSlot === 'SF' ? 'Small Forward' : currentSlot === 'PF' ? 'Power Forward' : 'Center'}...`
      : isAddingToComparison && comparisonPlayers.length === 1 
      ? "Search for a second player..." 
      : isAddingToComparison && comparisonPlayers.length === 2 
      ? "Search for a third player..." 
      : placeholder
  );

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-indigo-500/30">
      {isWelcomeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-slate-900/50 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to DraftRoom</h2>
            <p className="text-slate-400 mb-8">
              Our backend runs on a free server that takes up to 60 seconds to wake up on your first request. Search results and player analysis will load shortly — thank you for your patience.
            </p>
            <button
              onClick={() => setIsWelcomeModalOpen(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors w-full"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={handleResetApp} className="flex items-center gap-2 cursor-pointer border-none bg-transparent p-0">
              <TrendingUp className="w-8 h-8 text-purple-500" strokeWidth={2.5} />
              <span className="text-xl font-extrabold tracking-tight text-white">DraftRoom</span>
            </button>
            <button 
              onClick={() => {
                setTeamBuilderMode(true);
                setSelectedPlayer(null);
                setComparisonMode(false);
                setComparisonPlayers([]);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800"
            >
              Build Team
            </button>
          </div>
          <div className="relative group">
            <button className="text-slate-300 hover:text-white font-medium px-4 py-2 rounded-lg transition-colors">
              Login
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              Coming Soon
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-700"></div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-800"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-16">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-slate-100 mb-4 tracking-tight flex justify-center">
            DraftRoom
          </h1>
          <p className="text-lg md:text-xl text-slate-400 italic max-w-2xl mb-10">
            Evaluate Talent with Precision
          </p>
          
          <div className="relative w-full max-w-2xl">
            {isAddingToComparison && comparisonPlayers.length > 0 && (
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                {comparisonPlayers.length === 1 
                  ? `Comparing against ${comparisonPlayers[0].player.first_name} ${comparisonPlayers[0].player.last_name} — search a second player`
                  : `Add a third player to compare`}
              </div>
            )}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="block w-full pl-11 pr-12 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg shadow-slate-900/50 text-lg"
                placeholder={currentPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  setTimeout(() => setSearchResults([]), 200);
                }}
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
                </div>
              )}
            </div>

            {/* Dropdown */}
            {searchResults.length > 0 && isFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                {searchResults.map((player) => (
                  <button
                    key={player.id}
                    className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors flex items-center justify-between border-b border-slate-800/50 last:border-0"
                    onMouseDown={() => {
                      handlePlayerSelect(player);
                    }}
                  >
                    <div>
                      <div className="text-slate-100 font-medium flex items-center gap-2">
                        {player.first_name} {player.last_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Error Message */}
            {searchError && (
              <div className="absolute top-full left-0 right-0 mt-2 text-red-400 text-sm text-center">
                {searchError}
              </div>
            )}

            {/* Pending Player Prompt */}
            {pendingPlayer && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50 flex items-center justify-between">
                <span className="text-slate-300 text-sm font-medium">This will end your current comparison. Continue?</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setPendingPlayer(null);
                      setSearchQuery('');
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const p = pendingPlayer;
                      setPendingPlayer(null);
                      setComparisonMode(false);
                      setComparisonPlayers([]);
                      handlePlayerSelect(p, true);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    End Comparison
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Builder Panel */}
        {teamBuilderMode && (
          <div className="w-full max-w-5xl mx-auto mt-8 mb-16">
            {mismatchWarning && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-amber-400 font-semibold mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Position Mismatch Warning
                  </h3>
                  <p className="text-amber-200/70 text-sm mb-3">
                    {mismatchWarning.player.first_name} {mismatchWarning.player.last_name} is listed as {mismatchWarning.player.position || 'Unknown'}, but you are placing them in the {mismatchWarning.slot} slot. This may negatively impact your team's Defensive Rating.
                  </p>
                  <label className="flex items-center gap-2 text-sm text-amber-200/90 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={mismatchConfirmed}
                      onChange={(e) => setMismatchConfirmed(e.target.checked)}
                      className="rounded border-amber-500/30 bg-amber-500/10 text-amber-500 focus:ring-amber-500/50"
                    />
                    I understand, place player out of position
                  </label>
                  <label className="flex items-center gap-2 text-sm text-amber-200/90 cursor-pointer mt-2">
                    <input 
                      type="checkbox" 
                      checked={suppressPositionWarnings}
                      onChange={(e) => setSuppressPositionWarnings(e.target.checked)}
                      className="rounded border-amber-500/30 bg-amber-500/10 text-amber-500 focus:ring-amber-500/50"
                    />
                    Don't show position warnings for the rest of this team
                  </label>
                </div>
                <div className="flex gap-3 ml-4">
                  <button 
                    onClick={() => setMismatchWarning(null)}
                    className="px-4 py-2 text-sm font-medium text-amber-200/70 hover:text-amber-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!mismatchConfirmed}
                    onClick={() => fillSlot(mismatchWarning.slot, mismatchWarning.data)}
                    className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-5 gap-4 mb-8">
              {['PG', 'SG', 'SF', 'PF', 'C'].map((slot) => {
                const data = teamSlots[slot];
                const isActive = currentSlot === slot;
                return (
                  <div 
                    key={slot}
                    onClick={() => setCurrentSlot(slot)}
                    className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all relative ${isActive ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="text-xs font-bold text-slate-500 mb-2">{slot}</div>
                    {data ? (
                      <div className="flex flex-col items-center text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTeamSlots(prev => ({ ...prev, [slot]: null }));
                            setCurrentSlot(slot);
                            setTeamResult(null);
                            setIsTeamSaved(false);
                            setCurrentTeamId(null);
                            setShowTeamNameInput(false);
                          }}
                          className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden mb-2 border border-slate-700">
                          <img 
                            src={`https://cdn.nba.com/headshots/nba/latest/260x190/${data.player.id}.png`}
                            alt={`${data.player.first_name} ${data.player.last_name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png';
                            }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-sm font-bold text-slate-200 line-clamp-1">{data.player.first_name} {data.player.last_name}</div>
                        <div className="text-xs text-slate-400 mb-2">{data.player.position || 'N/A'}</div>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
                          DR: {data.draftScore.draftroom_score.toFixed(1)}
                        </div>
                      </div>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-slate-600 text-sm italic">
                        Empty
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {teamResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-900/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Team Analysis</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <button 
                        onClick={() => {
                          if (isTeamSaved) {
                            if (currentTeamId) {
                              setSavedTeams(prev => prev.filter(t => t.id !== currentTeamId));
                            }
                            setIsTeamSaved(false);
                            setCurrentTeamId(null);
                            setShowTeamNameInput(false);
                          } else {
                            setShowTeamNameInput(!showTeamNameInput);
                            if (!showTeamNameInput) {
                              setTeamNameInput('');
                            }
                          }
                        }}
                        className={`p-2 rounded-xl transition-colors flex items-center justify-center ${
                          isTeamSaved 
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                        title={isTeamSaved ? "Unsave Team" : "Save Team"}
                      >
                        <Bookmark className="w-5 h-5" fill={isTeamSaved ? "currentColor" : "none"} />
                      </button>
                      
                      {showTeamNameInput && !isTeamSaved && (
                        <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-10 w-64 flex flex-col gap-3">
                          <input
                            type="text"
                            placeholder={`Team ${savedTeams.length + 1}`}
                            value={teamNameInput}
                            onChange={(e) => setTeamNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const finalName = teamNameInput.trim() || `Team ${savedTeams.length + 1}`;
                                const newId = Date.now();
                                const newTeam: SavedTeam = {
                                  id: newId,
                                  timestamp: Date.now(),
                                  slots: teamSlots,
                                  scores: teamResult,
                                  name: finalName
                                };
                                setSavedTeams(prev => [newTeam, ...prev]);
                                setIsTeamSaved(true);
                                setCurrentTeamId(newId);
                                setShowTeamNameInput(false);
                              }
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setShowTeamNameInput(false);
                                setTeamNameInput('');
                              }}
                              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                const finalName = teamNameInput.trim() || `Team ${savedTeams.length + 1}`;
                                const newId = Date.now();
                                const newTeam: SavedTeam = {
                                  id: newId,
                                  timestamp: Date.now(),
                                  slots: teamSlots,
                                  scores: teamResult,
                                  name: finalName
                                };
                                setSavedTeams(prev => [newTeam, ...prev]);
                                setIsTeamSaved(true);
                                setCurrentTeamId(newId);
                                setShowTeamNameInput(false);
                              }}
                              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        setTeamSlots({ PG: null, SG: null, SF: null, PF: null, C: null });
                        setCurrentSlot('PG');
                        setTeamResult(null);
                        setSuppressPositionWarnings(false);
                        setIsTeamSaved(false);
                        setCurrentTeamId(null);
                        setShowTeamNameInput(false);
                      }}
                      className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset Team
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-950 border border-purple-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-sm font-medium text-purple-400 mb-2">DraftRoom Team Score</div>
                    <div className="text-4xl font-black text-white">{teamResult.teamScore.toFixed(1)}</div>
                  </div>
                  <div className="bg-slate-950 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-sm font-medium text-emerald-400 mb-2">Offensive Rating</div>
                    <div className="text-4xl font-black text-white">{teamResult.offRating.toFixed(1)}</div>
                  </div>
                  <div className="bg-slate-950 border border-blue-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-sm font-medium text-blue-400 mb-1">Defensive Rating</div>
                    <div className="text-xs text-slate-500 mb-2">(lower is better)</div>
                    <div className="text-4xl font-black text-white">{teamResult.defRating.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Player View */}
        {!teamBuilderMode && selectedPlayer && (
          <div className="mb-16">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col shadow-xl shadow-slate-900/50">
              <div className="flex justify-between items-start w-full mb-6">
                <div>
                  {comparisonMode && comparisonPlayers.length > 1 && (
                    <h2 className="text-2xl font-bold text-slate-100">Player Comparison</h2>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!comparisonMode && (
                    <button 
                      onClick={handleToggleBookmarkSelected}
                      className={`transition-colors p-2 rounded-lg ${watchlist.some(p => p.id === selectedPlayer.id.toString()) ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                      title={watchlist.some(p => p.id === selectedPlayer.id.toString()) ? "Remove from Watchlist" : "Add to Watchlist"}
                    >
                      <Bookmark className="w-5 h-5" fill={watchlist.some(p => p.id === selectedPlayer.id.toString()) ? "currentColor" : "none"} />
                    </button>
                  )}
                  {!comparisonMode && (
                    <button 
                      onClick={() => {
                        setComparisonMode(true);
                        setIsAddingToComparison(true);
                        setComparisonPlayers([{
                          player: selectedPlayer,
                          stats: selectedPlayerStats,
                          draftScore: selectedPlayerDraftScore,
                          trajectory: selectedPlayerTrajectory,
                          isLoading: false
                        }]);
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      disabled={isLoadingStats || isLoadingDraftScore || isLoadingTrajectory}
                      className="text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 text-sm font-medium border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Compare
                    </button>
                  )}
                  {comparisonMode && comparisonPlayers.length === 1 && (
                    <button 
                      onClick={() => {
                        setComparisonMode(false);
                        setIsAddingToComparison(false);
                        setComparisonPlayers([]);
                        setSearchQuery(`${selectedPlayer.first_name} ${selectedPlayer.last_name}`);
                      }}
                      className="text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 text-sm font-medium border border-slate-700"
                    >
                      Cancel Compare
                    </button>
                  )}
                  {comparisonMode && comparisonPlayers.length === 2 && !isAddingToComparison && (
                    <button 
                      onClick={() => {
                        setIsAddingToComparison(true);
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 text-sm font-medium border border-slate-700"
                    >
                      Add Third Player
                    </button>
                  )}
                  {comparisonMode && comparisonPlayers.length > 1 ? (
                    <button 
                      onClick={() => {
                        setSelectedPlayer(null);
                        setSearchQuery('');
                        setComparisonMode(false);
                        setComparisonPlayers([]);
                        setIsAddingToComparison(false);
                      }}
                      className="text-rose-400 hover:text-rose-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-400/10 text-sm font-medium border border-rose-400/20"
                    >
                      End Comparison
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setSelectedPlayer(null);
                        setSearchQuery('');
                        setComparisonMode(false);
                        setComparisonPlayers([]);
                        setIsAddingToComparison(false);
                      }}
                      className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              
              {comparisonMode && comparisonPlayers.length > 1 ? (
                <div className="flex flex-col">
                  <div className={`grid grid-cols-1 ${comparisonPlayers.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-8`}>
                    {comparisonPlayers.map((cp, idx) => {
                      const radarColor = idx === 0 ? 'rgb(168,85,247)' : idx === 1 ? 'rgb(52,211,153)' : 'rgb(251,191,36)';
                      return (
                      <div key={cp.player.id} className="flex flex-col">
                        {/* Header */}
                        <div className="text-center mb-8 flex flex-col items-center">
                          <img 
                            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${cp.player.id}.png`}
                            alt={`${cp.player.first_name} ${cp.player.last_name}`}
                            className="w-16 h-16 rounded-xl object-cover mb-3 bg-slate-800/50"
                            onError={(e) => e.currentTarget.style.display = 'none'}
                            referrerPolicy="no-referrer"
                          />
                          <h3 className="text-2xl font-bold text-slate-100 mb-2">
                            {cp.player.first_name} {cp.player.last_name}
                          </h3>
                          <div className="text-slate-400 text-sm mb-4">
                            {cp.player.team.full_name} {cp.player.position ? `• ${abbreviatePosition(cp.player.position)}` : ''}
                          </div>
                          <div className="flex justify-center">
                            {cp.isLoading ? (
                              <div className="flex items-center justify-center w-16 h-16 rounded-xl border bg-slate-800/50 border-slate-700">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className={`flex items-center justify-center w-16 h-16 rounded-xl border ${cp.draftScore ? getScoreBg(cp.draftScore.draftroom_score) : 'bg-slate-800/50 border-slate-700'}`}>
                                  <span className={`text-2xl font-bold ${cp.draftScore ? getScoreColor(cp.draftScore.draftroom_score) : 'text-slate-500'}`}>
                                    {cp.draftScore ? cp.draftScore.draftroom_score : '—'}
                                  </span>
                                </div>
                                {cp.draftScore && (
                                  <div className="w-[160px] h-[160px] mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <RadarChart data={[
                                        { subject: 'Efficiency', A: cp.draftScore.components.ts_rel_score },
                                        { subject: 'Playmaking', A: cp.draftScore.components.play_score },
                                        { subject: 'Defense', A: cp.draftScore.components.def_score },
                                        { subject: 'Foul Draw', A: cp.draftScore.components.ftr_score },
                                        { subject: 'Volume', A: cp.draftScore.components.vol_eff_score },
                                      ]}>
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Radar dataKey="A" stroke={radarColor} strokeOpacity={0.8} fill={radarColor} fillOpacity={0.2} />
                                      </RadarChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50 mb-8 flex-1">
                          <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">
                            Season Form
                          </div>
                          {cp.isLoading ? (
                             <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                          ) : (
                            <div className="flex flex-col">
                              {[
                                { label: 'PTS', key: 'pts' },
                                { label: 'AST', key: 'ast' },
                                { label: 'REB', key: 'reb' },
                                { label: 'FG%', key: 'fg_pct', isPercentage: true },
                                { label: 'STL', key: 'stl' },
                                { label: 'BLK', key: 'blk' }
                              ].map(stat => {
                                const val = cp.stats?.[stat.key] || 0;
                                const allVals = comparisonPlayers.map(p => p.stats?.[stat.key] || 0);
                                const color = getStatColor(val, allVals);
                                const displayVal = stat.isPercentage ? (val * 100).toFixed(1) + '%' : val.toFixed(1);

                                return (
                                  <div key={stat.label} className="flex justify-between items-center py-3 border-b border-slate-800/50 last:border-0">
                                    <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">{stat.label}</span>
                                    <span className={`text-xl font-bold ${color}`}>{displayVal}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Trajectory */}
                        <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50">
                          <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">
                            5-Game Proj
                          </div>
                          {cp.isLoading ? (
                             <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                          ) : (
                            <div className="flex flex-col">
                              {[
                                { label: 'PTS', key: 'PTS' },
                                { label: 'AST', key: 'AST' },
                                { label: 'REB', key: 'REB' },
                                { label: 'DR Score', key: 'DraftRoomScore' }
                              ].map(stat => {
                                const t = cp.trajectory?.[stat.key as keyof TrajectoryResponse];
                                const val = t?.value || 0;
                                const allVals = comparisonPlayers.map(p => p.trajectory?.[stat.key as keyof TrajectoryResponse]?.value || 0);
                                const color = getStatColor(val, allVals);
                                const displayVal = val.toFixed(1);

                                return (
                                  <div key={stat.label} className="flex justify-between items-center py-3 border-b border-slate-800/50 last:border-0">
                                    <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">{stat.label}</span>
                                    <div className={`flex items-center gap-2 ${color}`}>
                                      {t && getTrendIcon(t.trend)}
                                      <span className="text-xl font-bold">{displayVal}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                  <div className="flex-1 w-full">
                  <div className="flex items-center gap-4 mb-2">
                    <img 
                      src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${selectedPlayer.id}.png`}
                      alt={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
                      className="w-20 h-20 rounded-xl object-cover border border-slate-700 bg-slate-800/50"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-bold text-slate-100">
                          {selectedPlayer.first_name} {selectedPlayer.last_name}
                        </h2>
                        {selectedPlayer.position && (
                          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-sm font-semibold border border-slate-700">
                            {abbreviatePosition(selectedPlayer.position)}
                          </span>
                        )}
                        {selectedPlayerStats?.daysSinceLastGame > 7 && (
                          <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20 flex items-center gap-1">
                            Last played {selectedPlayerStats.daysSinceLastGame} days ago
                          </span>
                        )}
                      </div>
                      <p className="text-lg text-slate-400">
                        {selectedPlayer.team.full_name}
                      </p>
                    </div>
                  </div>
                  
                  {isLoadingStats ? (
                    <div className="flex items-center gap-3 text-slate-400 py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                      <span>Loading Season Form — Last 10 Games...</span>
                    </div>
                  ) : selectedPlayerStats ? (
                    <div>
                      <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Season Form — Last {selectedPlayerStats.count} {selectedPlayerStats.count === 1 ? 'Game' : 'Games'}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
                          <div className="text-sm text-slate-500 mb-1 font-medium">PTS</div>
                          <div className="text-3xl font-bold text-slate-200">{selectedPlayerStats.pts?.toFixed(1) || '0.0'}</div>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
                          <div className="text-sm text-slate-500 mb-1 font-medium">AST</div>
                          <div className="text-3xl font-bold text-slate-200">{selectedPlayerStats.ast?.toFixed(1) || '0.0'}</div>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
                          <div className="text-sm text-slate-500 mb-1 font-medium">REB</div>
                          <div className="text-3xl font-bold text-slate-200">{selectedPlayerStats.reb?.toFixed(1) || '0.0'}</div>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
                          <div className="text-sm text-slate-500 mb-1 font-medium">FG%</div>
                          <div className="text-3xl font-bold text-slate-200">{((selectedPlayerStats.fg_pct || 0) * 100).toFixed(1)}%</div>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
                          <div className="text-sm text-slate-500 mb-1 font-medium">STL</div>
                          <div className="text-3xl font-bold text-slate-200">{selectedPlayerStats.stl?.toFixed(1) || '0.0'}</div>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
                          <div className="text-sm text-slate-500 mb-1 font-medium">BLK</div>
                          <div className="text-3xl font-bold text-slate-200">{selectedPlayerStats.blk?.toFixed(1) || '0.0'}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic py-4 bg-slate-950/30 rounded-xl px-4 border border-slate-800/30">
                      No Season Form — Last 10 Games available.
                    </div>
                  )}

                  {/* 5-Game Projection Section */}
                  <div className="mt-8">
                    <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      5-Game Projection
                    </div>
                    {isLoadingTrajectory ? (
                      <div className="flex items-center gap-3 text-slate-400 py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                        <span>Computing Projections...</span>
                      </div>
                    ) : selectedPlayerTrajectory ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'PTS', data: selectedPlayerTrajectory.PTS },
                          { label: 'AST', data: selectedPlayerTrajectory.AST },
                          { label: 'REB', data: selectedPlayerTrajectory.REB },
                          { label: 'DR Score', data: selectedPlayerTrajectory.DraftRoomScore }
                        ].map((stat, idx) => (
                          <div key={idx} className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
                              {stat.data.trend === 'up' ? (
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                              ) : stat.data.trend === 'down' ? (
                                <TrendingDown className="w-4 h-4 text-rose-400" />
                              ) : stat.data.trend === 'stable' ? (
                                <Minus className="w-4 h-4 text-slate-400" />
                              ) : null}
                            </div>
                            <div className="text-2xl font-bold text-slate-200 mb-2">
                              {stat.data.value.toFixed(1)}
                            </div>
                            <div className="mt-auto">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${stat.data.confidence >= 70 ? 'bg-emerald-500' : stat.data.confidence >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                    style={{ width: `${stat.data.confidence}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">{stat.data.confidence.toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic py-4 bg-slate-950/30 rounded-xl px-4 border border-slate-800/30">
                        Projection unavailable (needs 5+ games).
                      </div>
                    )}
                  </div>
                </div>

                {/* DraftRoom Score Section */}
                <div className="w-full md:w-64 flex flex-col items-center bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50">
                  {isLoadingDraftScore ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
                      <span className="text-sm text-slate-400">Computing Score...</span>
                    </div>
                  ) : selectedPlayerDraftScore ? (
                    <>
                      <div className={`flex items-center justify-center w-24 h-24 rounded-2xl border mb-3 ${getScoreBg(selectedPlayerDraftScore.draftroom_score)}`}>
                        <span className={`text-4xl font-bold ${getScoreColor(selectedPlayerDraftScore.draftroom_score)}`}>
                          {selectedPlayerDraftScore.draftroom_score}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">DraftRoom Score</span>
                      
                      <div className="w-[200px] h-[200px] mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={[
                            { subject: 'Efficiency', A: selectedPlayerDraftScore.components.ts_rel_score },
                            { subject: 'Playmaking', A: selectedPlayerDraftScore.components.play_score },
                            { subject: 'Defense', A: selectedPlayerDraftScore.components.def_score },
                            { subject: 'Foul Draw', A: selectedPlayerDraftScore.components.ftr_score },
                            { subject: 'Volume', A: selectedPlayerDraftScore.components.vol_eff_score },
                          ]}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Radar dataKey="A" stroke="rgb(168,85,247)" strokeOpacity={0.8} fill="rgb(168,85,247)" fillOpacity={0.2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="w-full space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">TS Rel</span>
                          <span className="text-slate-200 font-medium">{selectedPlayerDraftScore.components.ts_rel_score}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Playmaking</span>
                          <span className="text-slate-200 font-medium">{selectedPlayerDraftScore.components.play_score}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Def Impact</span>
                          <span className="text-slate-200 font-medium">{selectedPlayerDraftScore.components.def_score}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Foul Rate</span>
                          <span className="text-slate-200 font-medium">{selectedPlayerDraftScore.components.ftr_score}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Vol Eff</span>
                          <span className="text-slate-200 font-medium">{selectedPlayerDraftScore.components.vol_eff_score}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500 italic py-8 text-center text-sm">
                      Score unavailable (needs 5+ games)
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>
          </div>
        )}

        {/* My Watchlist */}
        {!teamBuilderMode && watchlist.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <Bookmark className="w-5 h-5 text-indigo-400" fill="currentColor" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100">My Watchlist</h2>
              </div>
              <button 
                onClick={() => setWatchlist([])}
                className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchlist.map(player => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  onSelect={handleSelectPlayerCard} 
                  isBookmarked={true}
                  onToggleBookmark={toggleBookmark}
                  showBookmark={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* My Teams */}
        {!teamBuilderMode && savedTeams.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <Bookmark className="w-5 h-5 text-purple-400" fill="currentColor" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100">My Teams</h2>
              </div>
              <button 
                onClick={() => setSavedTeams([])}
                className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedTeams.map(team => (
                <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-slate-900/50 relative group">
                  <button 
                    onClick={() => {
                      if (suppressTeamDeleteConfirm) {
                        setSavedTeams(prev => prev.filter(t => t.id !== team.id));
                      } else {
                        setTeamToDelete(team.id);
                      }
                    }}
                    className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 z-20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  {teamToDelete === team.id && (
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center justify-center z-30 border border-slate-800">
                      <div className="text-slate-200 font-medium mb-4">Delete this team?</div>
                      <div className="flex gap-3 w-full mb-4">
                        <button
                          onClick={() => {
                            setSavedTeams(prev => prev.filter(t => t.id !== team.id));
                            setTeamToDelete(null);
                          }}
                          className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setTeamToDelete(null)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={suppressTeamDeleteConfirm}
                          onChange={(e) => setSuppressTeamDeleteConfirm(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-800 text-purple-500 focus:ring-purple-500/20"
                        />
                        Don't show again
                      </label>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-lg font-bold text-slate-100">{team.name || `Team ${team.id}`}</div>
                    <div className="text-xs text-slate-500">{new Date(team.timestamp).toLocaleDateString()}</div>
                  </div>
                  <div className="space-y-2 mb-6">
                    {['PG', 'SG', 'SF', 'PF', 'C'].map(slot => {
                      const data = team.slots[slot];
                      return (
                        <div key={slot} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 w-6">{slot}</span>
                            <span className="text-slate-300 font-medium">{data ? `${data.player.first_name} ${data.player.last_name}` : 'Empty'}</span>
                          </div>
                          {data && (
                            <span className="text-xs font-bold text-slate-500">{data.player.position}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <div className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
                      DR: {team.scores.teamScore.toFixed(1)}
                    </div>
                    <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      OFF: {team.scores.offRating.toFixed(1)}
                    </div>
                    <div className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                      DEF: {team.scores.defRating.toFixed(1)}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setTeamBuilderMode(true);
                        setTeamSlots(team.slots);
                        setTeamResult(team.scores);
                        setIsTeamSaved(true);
                        setCurrentTeamId(team.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Open in Builder
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Breakout Alerts */}
        {!teamBuilderMode && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100">Breakout Alerts</h2>
            </div>
            {isLoadingBatch ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800/50 h-40 animate-pulse">
                    <div className="flex gap-4 h-full">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl"></div>
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : batchError ? (
              <div className="text-rose-400 bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">
                {batchError}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {breakoutPlayers.map(player => (
                  <PlayerCard 
                    key={player.id} 
                    player={player} 
                    isBreakout={true} 
                    onSelect={handleSelectPlayerCard} 
                    isBookmarked={watchlist.some(p => p.id === player.id)}
                    onToggleBookmark={toggleBookmark}
                  />
                ))}
              </div>
            )}
          </div>
        )}



        {/* Top Prospects Grid */}
        {!teamBuilderMode && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-100">Top Prospects</h2>
              <div className="flex gap-2">
              <select 
                className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none"
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
              >
                <option>All Positions</option>
                <option>Guards</option>
                <option>Forwards</option>
                <option>Centers</option>
              </select>
              <select 
                className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
              >
                <option>Highest Score</option>
                <option>Trending Up</option>
                <option>Most Points</option>
              </select>
            </div>
          </div>
          {isLoadingBatch ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800/50 h-40 animate-pulse">
                  <div className="flex gap-4 h-full">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl"></div>
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                      <div className="h-8 bg-slate-800 rounded w-full mt-auto"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : batchError ? (
            <div className="text-rose-400 bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">
              {batchError}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedPlayers.map(player => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  onSelect={handleSelectPlayerCard} 
                  isBookmarked={watchlist.some(p => p.id === player.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}
        </div>
        )}
      </main>
      <footer className="bg-slate-900 border-t border-slate-800 mt-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-purple-500" strokeWidth={2.5} />
          <span className="text-lg font-extrabold tracking-tight text-white">DraftRoom</span>
        </div>
        <p className="text-sm text-slate-400 italic">Evaluate Talent with Precision</p>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Built With</p>
        <div className="flex flex-wrap gap-2">
          {['React', 'TypeScript', 'FastAPI', 'Python', 'nba_api', 'Tailwind CSS', 'Recharts'].map(tech => (
            <span key={tech} className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700">{tech}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <a href="https://github.com/ashadsmh" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200 transition-colors text-sm flex items-center gap-1">
          GitHub — ashadsmh <ChevronRight className="w-3 h-3" />
        </a>
        <p className="text-xs text-slate-500">Powered by NBA.com data via nba_api</p>
      </div>
    </div>
    <div className="border-t border-slate-800 pt-6">
      <p className="text-center text-xs text-slate-500">© 2026 DraftRoom. Built by Ashad</p>
    </div>
  </div>
</footer>
    </div>
  );
}