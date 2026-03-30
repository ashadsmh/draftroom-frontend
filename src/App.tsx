import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, TrendingUp, Star, ChevronRight, Loader2, X, Bookmark, AlertTriangle, Zap, BarChart2 } from 'lucide-react';
import { getComputedAverages, NbaPlayer, getDraftRoomScore, getTrajectory, getPlayerInfo, getBreakoutAlerts, BreakoutPlayer, pingBackend, getBatchScores } from './api/nba';
import PlayerCard, { abbreviatePosition, TrendIcon } from './components/PlayerCard';
import PlayerPanel from './components/PlayerPanel';
import ComparisonPanel from './components/ComparisonPanel';
import TeamBuilder, { TeamBuilderRef } from './components/TeamBuilder';
import OptimizeLineup from './components/OptimizeLineup';
import TourOverlay from './components/TourOverlay';
import UserMenu from './components/UserMenu';
import LandingPage from './components/LandingPage';
import { useSearch } from './hooks/useSearch';
import { usePlayerData } from './hooks/usePlayerData';
import { useTour, LEBRON_ID } from './hooks/useTour';
import { useAuth } from './hooks/useAuth';
import { useFirestoreData } from './hooks/useFirestoreData';
import { ComparisonPlayer, TeamSlot, Player, SavedTeam, getScoreColor } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const LANDING_KEY = 'draftroom_visited';

// Defined at module level so it's never recreated on render
const SEARCH_PLACEHOLDERS = [
  'Search LeBron James...',
  'Search Nikola Jokic...',
  'Search Jayson Tatum...',
  'Search Luka Doncic...',
];

const HARDCODED_TOP_PROSPECTS: Player[] = [
  { id: '203999',  name: 'Nikola Jokic',              position: 'C',  team: 'DEN', score: null, stats: null, trend: null },
  { id: '1628983', name: 'Shai Gilgeous-Alexander',   position: 'PG', team: 'OKC', score: null, stats: null, trend: null },
  { id: '1641705', name: 'Victor Wembanyama',          position: 'C',  team: 'SAS', score: null, stats: null, trend: null },
  { id: '203507',  name: 'Giannis Antetokounmpo',      position: 'PF', team: 'MIL', score: null, stats: null, trend: null },
  { id: '1629029', name: 'Luka Doncic',                position: 'PG', team: 'DAL', score: null, stats: null, trend: null },
  { id: '1630162', name: 'Anthony Edwards',            position: 'SG', team: 'MIN', score: null, stats: null, trend: null },
];

const EMPTY_TEAM_SLOTS: Record<string, TeamSlot | null> = {
  PG: null, SG: null, SF: null, PF: null, C: null,
};

// ─── Helper: resolve position/team from API if missing ───────────────────────

async function resolvePlayerInfo(player: NbaPlayer): Promise<NbaPlayer> {
  if (player.position && player.team.full_name !== 'NBA') return player;
  try {
    const info = await getPlayerInfo(player.id);
    if (info?.CommonPlayerInfo?.length > 0) {
      const p = info.CommonPlayerInfo[0];
      return {
        ...player,
        position: p.POSITION,
        team: { full_name: `${p.TEAM_CITY} ${p.TEAM_NAME}`.trim() },
      };
    }
  } catch (err) {
    console.error(err);
  }
  return player;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const [showLanding, setShowLanding] = useState(() => !localStorage.getItem(LANDING_KEY));

  const handleEnterApp = (mode?: 'optimize') => {
    localStorage.setItem(LANDING_KEY, 'true');
    setShowLanding(false);
    if (mode === 'optimize') setOptimizeMode(true);
  };

  const { searchQuery, setSearchQuery, searchResults, setSearchResults, isSearching, searchError, triggerSearch } = useSearch();
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const { user, isLoading: isAuthLoading, signInWithGoogle, signOutUser } = useAuth();
  const { watchlist, setWatchlist, savedTeams, setSavedTeams } = useFirestoreData(user);

  // ─── Typewriter placeholder ──────────────────────────────────────────────
  const [placeholder, setPlaceholder] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const typeState = useRef({ index: 0, text: '', isDeleting: false });

  // ─── Selected player state ───────────────────────────────────────────────
  const [selectedPlayer, setSelectedPlayer]                   = useState<NbaPlayer | null>(null);
  const [selectedPlayerStats, setSelectedPlayerStats]         = useState<any>(null);
  const [selectedPlayerDraftScore, setSelectedPlayerDraftScore] = useState<any>(null);
  const [selectedPlayerTrajectory, setSelectedPlayerTrajectory] = useState<any>(null);

  // ─── Player lists ────────────────────────────────────────────────────────
  const [players, setPlayers]               = useState<Player[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [breakoutPlayers, setBreakoutPlayers] = useState<Player[]>([]);
  const [isLoadingBreakout, setIsLoadingBreakout] = useState(true);
  const [breakoutError, setBreakoutError]   = useState<string | null>(null);
  const [showAllBreakout, setShowAllBreakout] = useState(false);

  // ─── Filters / sort ──────────────────────────────────────────────────────
  const [positionFilter, setPositionFilter] = useState('All Positions');
  const [sortFilter, setSortFilter] = useState('Highest Score');
  const [isLoadingBatch, setIsLoadingBatch] = useState(true);
  const [batchError, setBatchError] = useState<string | null>(null);

  // ─── Comparison ──────────────────────────────────────────────────────────
  const [comparisonMode, setComparisonMode]           = useState(false);
  const [comparisonPlayers, setComparisonPlayers]     = useState<ComparisonPlayer[]>([]);
  const [isAddingToComparison, setIsAddingToComparison] = useState(false);
  const [pendingPlayer, setPendingPlayer]             = useState<NbaPlayer | null>(null);

  // ─── Team builder ────────────────────────────────────────────────────────
  const [teamBuilderMode, setTeamBuilderMode]   = useState(false);
  const [teamBuilderError, setTeamBuilderError] = useState<string | null>(null);
  const [teamSlots, setTeamSlots]               = useState<Record<string, TeamSlot | null>>(EMPTY_TEAM_SLOTS);
  const [currentSlot, setCurrentSlot]           = useState<string>('PG');
  const [teamBCurrentSlot, setTeamBCurrentSlot] = useState<string>('PG');
  const [isComparingTeams, setIsComparingTeams] = useState(false);

  // ─── Saved teams delete confirm ──────────────────────────────────────────
  const [suppressTeamDeleteConfirm, setSuppressTeamDeleteConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete]         = useState<number | null>(null);

  // ─── Optimize mode ───────────────────────────────────────────────────────
  const [optimizeMode, setOptimizeMode] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const teamBuilderRef  = useRef<TeamBuilderRef>(null);

  // ─── Ping backend on mount ───────────────────────────────────────────────
  useEffect(() => { pingBackend(); }, []);

  // ─── Load batch scores ───────────────────────────────────────────────────
  useEffect(() => {
    setIsLoadingBatch(true);

    const CACHE_KEY = "draftroom_batch_cache";
    const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in ms

    const mapPlayer = (p: any): Player => ({
      id: String(p.id),
      name: p.name,
      position: p.position,
      team: p.team,
      score: p.score || null,
      stats: p.stats || null,
      trend: p.trend || null,
    });

    // Check localStorage first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setPlayers((data.leaderboard || []).map(mapPlayer));
          setBreakoutPlayers((data.breakout_alerts || []).map(mapPlayer));
          setIsLoadingBatch(false);
          // Still fetch fresh data in background to keep cache warm
          getBatchScores([]).then(response => {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data: response, timestamp: Date.now() }));
          }).catch(() => {});
          return;
        }
      }
    } catch {}

    // No valid cache — fetch fresh
    getBatchScores([])
      .then((data: any) => {
        setPlayers((data.leaderboard || []).map(mapPlayer));
        setBreakoutPlayers((data.breakout_alerts || []).map(mapPlayer));
        // Save to localStorage
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        } catch {}
      })
      .catch(err => {
        console.error("Batch fetch failed:", err);
        setBatchError('Failed to load player data. Please refresh.');
      })
      .finally(() => setIsLoadingBatch(false));
  }, []);

  // ─── Load breakout alerts ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingBreakout(true);
      setBreakoutError(null);
      try {
        const alerts = await getBreakoutAlerts();
        if (cancelled) return;
        if (alerts.length === 0) {
          setBreakoutError('No breakout candidates found right now. Check back soon.');
          return;
        }
        setBreakoutPlayers(alerts.map((p: BreakoutPlayer) => ({
          id:    p.id.toString(),
          name:  p.name,
          position: p.position || 'N/A',
          team:  p.team || 'NBA',
          score: p.score ?? null,
          stats: p.stats ? { pts: p.stats.pts, ast: p.stats.ast, reb: p.stats.reb } : null,
          trend: p.trend ?? null,
        })));
      } catch {
        if (!cancelled) setBreakoutError('Could not load breakout alerts.');
      } finally {
        if (!cancelled) setIsLoadingBreakout(false);
      }
    };
    const timer = setTimeout(load, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // ─── Reset highlighted index on new results ──────────────────────────────
  useEffect(() => { setHighlightedIndex(-1); }, [searchResults]);

  // ─── Typewriter effect ───────────────────────────────────────────────────
  useEffect(() => {
    if (isFocused) {
      setPlaceholder('');
      typeState.current = { index: 0, text: '', isDeleting: false };
      return;
    }
    let timeout: NodeJS.Timeout;
    const type = () => {
      const state    = typeState.current;
      const fullText = SEARCH_PLACEHOLDERS[state.index];
      state.text = state.isDeleting
        ? fullText.substring(0, state.text.length - 1)
        : fullText.substring(0, state.text.length + 1);
      setPlaceholder(state.text);
      let speed = state.isDeleting ? 30 : 80;
      if (!state.isDeleting && state.text === fullText) {
        speed = 1500;
        state.isDeleting = true;
      } else if (state.isDeleting && state.text === '') {
        state.isDeleting = false;
        state.index = (state.index + 1) % SEARCH_PLACEHOLDERS.length;
        speed = 400;
      }
      timeout = setTimeout(type, speed);
    };
    timeout = setTimeout(type, 100);
    return () => clearTimeout(timeout);
  }, [isFocused]);

  // ─── usePlayerData: update both player lists on load ─────────────────────
  // Single generic updater avoids three nearly-identical map functions
  const updatePlayerField = useCallback(
    (id: string, patch: Partial<Player>) => {
      const apply = (list: Player[]) =>
        list.map(p => (p.id === id ? { ...p, ...patch } : p));
      setPlayers(apply);
      setBreakoutPlayers(apply);
    },
    []
  );

  const { isLoadingStats, isLoadingDraftScore, isLoadingTrajectory } = usePlayerData({
    selectedPlayer,
    setSelectedPlayer,
    onStatsLoaded: (stats) => {
      setSelectedPlayerStats(stats);
      updatePlayerField(selectedPlayer?.id.toString() ?? '', {
        stats: { pts: stats.pts || 0, ast: stats.ast || 0, reb: stats.reb || 0 },
      });
    },
    onScoreLoaded: (score) => {
      setSelectedPlayerDraftScore(score);
      updatePlayerField(selectedPlayer?.id.toString() ?? '', {
        score: score.draftroom_score,
      });
    },
    onTrajectoryLoaded: (traj) => {
      setSelectedPlayerTrajectory(traj);
      updatePlayerField(selectedPlayer?.id.toString() ?? '', {
        trend: traj.DraftRoomScore.trend,
      });
    },
  });

  // ─── Tour ────────────────────────────────────────────────────────────────
  const handleTourStart = useCallback(() => {
    const lebron: Player = {
      id: LEBRON_ID,
      name: 'LeBron James',
      position: 'PF',
      team: 'LAL',
      score: null,
      stats: null,
      trend: null,
    };
    setWatchlist(prev =>
      prev.some(p => p.id === LEBRON_ID) ? prev : [...prev, lebron]
    );
  }, [setWatchlist]);

  const { isActive, currentStep, startTour, endTour, nextStep, prevStep } = useTour(
    handleTourStart,
    // onTourEnd: no-op, kept as stable reference
    useCallback(() => {}, [])
  );

  // ─── Watchlist toggle ────────────────────────────────────────────────────
  const toggleBookmark = useCallback((player: Player) => {
    setWatchlist(prev =>
      prev.some(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  }, [setWatchlist]);

  const handleToggleBookmarkSelected = useCallback(() => {
    if (!selectedPlayer) return;
    toggleBookmark({
      id:       selectedPlayer.id.toString(),
      name:     `${selectedPlayer.first_name} ${selectedPlayer.last_name}`,
      position: abbreviatePosition(selectedPlayer.position || ''),
      team:     selectedPlayer.team.full_name,
      score:    selectedPlayerDraftScore?.draftroom_score ?? null,
      stats:    selectedPlayerStats
        ? { pts: selectedPlayerStats.pts ?? 0, ast: selectedPlayerStats.ast ?? 0, reb: selectedPlayerStats.reb ?? 0 }
        : null,
      trend:    selectedPlayerTrajectory?.DraftRoomScore?.trend ?? null,
    });
  }, [selectedPlayer, selectedPlayerDraftScore, selectedPlayerStats, selectedPlayerTrajectory, toggleBookmark]);



  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSelectPlayerCard = useCallback((player: Player) => {
    const nameParts = player.name.split(' ');
    handlePlayerSelect({
      id:         parseInt(player.id),
      first_name: nameParts[0],
      last_name:  nameParts.slice(1).join(' '),
      position:   player.position,
      team:       { full_name: player.team },
    } as NbaPlayer);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchComparisonData = async (player: NbaPlayer) => {
    const resolved = await resolvePlayerInfo(player);
    Promise.allSettled([
      getComputedAverages(player.id),
      getDraftRoomScore(player.id),
      getTrajectory(player.id),
    ]).then(([statsRes, scoreRes, trajRes]) => {
      setComparisonPlayers(prev =>
        prev.map(p =>
          p.player.id === player.id
            ? {
                player:     resolved,
                stats:      statsRes.status === 'fulfilled' ? statsRes.value : null,
                draftScore: scoreRes.status === 'fulfilled' ? scoreRes.value : null,
                trajectory: trajRes.status  === 'fulfilled' ? trajRes.value  : null,
                isLoading:  false,
              }
            : p
        )
      );
    });
  };

  const handlePlayerSelect = async (player: NbaPlayer, force: boolean = false) => {
    if (teamBuilderMode) {
      setSearchQuery('');
      setSearchResults([]);
      setTeamBuilderError(null);

      const activeTeam  = teamBuilderRef.current?.getActiveTeam();
      const slotsToCheck = isComparingTeams && activeTeam === 'B'
        ? (teamBuilderRef.current?.getTeamBSlots() ?? {})
        : teamSlots;

      if (Object.values(slotsToCheck).some((s: any) => s?.player.id === player.id)) {
        setTeamBuilderError(`${player.first_name} ${player.last_name} is already on your team.`);
        setTimeout(() => setTeamBuilderError(null), 3000);
        return;
      }

      const resolved = await resolvePlayerInfo(player);
      const [draftScore, trajectory, stats] = await Promise.all([
        getDraftRoomScore(resolved.id),
        getTrajectory(resolved.id),
        getComputedAverages(resolved.id),
      ]);

      if (!draftScore || !trajectory || !stats) {
        setTeamBuilderError(
          `No stats available for ${resolved.first_name} ${resolved.last_name} — player may be inactive or retired.`
        );
        setTimeout(() => setTeamBuilderError(null), 4000);
        return;
      }

      const slotData: TeamSlot = { player: resolved, draftScore, trajectory, stats };
      if (isComparingTeams && activeTeam === 'B') {
        teamBuilderRef.current?.handleTeamBSlotSelection(resolved, slotData);
      } else {
        teamBuilderRef.current?.handleSlotSelection(resolved, slotData);
      }
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
          { player, stats: null, draftScore: null, trajectory: null, isLoading: true },
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
    setOptimizeMode(false);
    setTeamSlots(EMPTY_TEAM_SLOTS);
    setCurrentSlot('PG');
    setTeamBuilderError(null);
    setTeamToDelete(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Derived display values ───────────────────────────────────────────────
  const { activeSlot, slotLabel, teamLabel, currentPlaceholder } = useMemo(() => {
    const activeTeam = teamBuilderMode ? (teamBuilderRef.current?.getActiveTeam() ?? 'A') : 'A';
    const aSlot = isComparingTeams && activeTeam === 'B' ? teamBCurrentSlot : currentSlot;
    const labels: Record<string, string> = {
      PG: 'Point Guard', SG: 'Shooting Guard', SF: 'Small Forward', PF: 'Power Forward', C: 'Center',
    };
    const tLabel = teamBuilderMode && isComparingTeams
      ? (activeTeam === 'B' ? ' for Team B' : ' for Team A')
      : '';
    const cpHolder = isFocused ? '' : (
      teamBuilderMode
        ? `Search your ${labels[aSlot]}${tLabel}...`
        : isAddingToComparison && comparisonPlayers.length === 1
        ? 'Search for a second player...'
        : isAddingToComparison && comparisonPlayers.length === 2
        ? 'Search for a third player...'
        : placeholder
    );
    return { activeSlot: aSlot, slotLabel: labels[aSlot], teamLabel: tLabel, currentPlaceholder: cpHolder };
  }, [teamBuilderMode, isComparingTeams, teamBCurrentSlot, currentSlot, isFocused, isAddingToComparison, comparisonPlayers.length, placeholder]);

  const visibleBreakoutPlayers = showAllBreakout
    ? breakoutPlayers.slice(0, 6)
    : breakoutPlayers.slice(0, 3);

  const filteredPlayers = players
    .filter(p => {
      if (positionFilter === 'All Positions') return true;
      if (positionFilter === 'Guards') return ['PG','SG','G'].includes(p.position);
      if (positionFilter === 'Forwards') return ['SF','PF','F'].includes(p.position);
      if (positionFilter === 'Centers') return ['C'].includes(p.position);
      return true;
    })
    .sort((a, b) => {
      if (sortFilter === 'Trending Up') {
        const trendScore = (t: Player['trend']) => t === 'up' ? 2 : t === 'stable' ? 1 : 0;
        return trendScore(b.trend) - trendScore(a.trend);
      }
      if (sortFilter === 'Most Points') {
        return (b.stats?.pts ?? 0) - (a.stats?.pts ?? 0);
      }
      return (b.score ?? 0) - (a.score ?? 0); // default: Highest Score
    });

  if (showLanding) return <LandingPage onEnterApp={handleEnterApp} />;

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-indigo-500/30 flex flex-col">
      {/* ─── Navigation ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleResetApp} className="flex items-center gap-2 cursor-pointer border-none bg-transparent p-0">
              <TrendingUp className="w-8 h-8 text-purple-500" strokeWidth={2.5} />
              <span className="text-xl font-extrabold tracking-tight text-white">DraftRoom</span>
            </button>
            <button
              id="tour-build-team"
              onClick={() => {
                setTeamBuilderMode(true);
                setOptimizeMode(false);
                setSelectedPlayer(null);
                setComparisonMode(false);
                setComparisonPlayers([]);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800"
            >
              Build Team
            </button>
            <button
              id="tour-optimize"
              onClick={() => {
                setOptimizeMode(true);
                setTeamBuilderMode(false);
                setSelectedPlayer(null);
                setComparisonMode(false);
                setComparisonPlayers([]);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800"
            >
              Optimize Lineup
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startTour}
              className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800"
            >
              Tutorial
            </button>
            {isAuthLoading ? (
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            ) : user ? (
              <UserMenu user={user} onSignOut={signOutUser} />
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Main ───────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        {!optimizeMode && (
          <div id="tour-hero" className="flex flex-col items-center text-center mb-16">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-slate-100 mb-3 tracking-tight">
              DraftRoom
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-8">
              The Best Analytics Tool for Fantasy Basketball
            </p>

            {!selectedPlayer && !teamBuilderMode && (
              <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-10 w-full max-w-3xl">
                <div id="tour-dr-score" className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 flex-1 min-h-[80px]">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20 flex-shrink-0">
                    <BarChart2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-200">DR Score</div>
                    <div className="text-xs text-slate-500">Efficiency metric: TS%, Playmaking, Defense, Foul Draw &amp; Volume</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 flex-1 min-h-[80px]">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex-shrink-0">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-200">Optimize Lineup</div>
                    <div className="text-xs text-slate-500">Learn who to start/sit from your roster</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 flex-1 min-h-[80px]">
                  <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20 flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-200">5-Game Projections</div>
                    <div className="text-xs text-slate-500">Predicted stats for a five game forecast</div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Search bar ─────────────────────────────────────────────── */}
            <div className="relative w-full max-w-2xl">
              {isAddingToComparison && (
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  {comparisonPlayers.length === 0
                    ? 'Search for a player to compare'
                    : comparisonPlayers.length === 1
                    ? `Comparing against ${comparisonPlayers[0].player.first_name} ${comparisonPlayers[0].player.last_name} — search a replacement`
                    : 'Add a third player to compare'}
                </div>
              )}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="tour-search"
                  ref={searchInputRef}
                  type="text"
                  className="block w-full pl-11 pr-12 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-lg shadow-slate-900/50 text-lg"
                  placeholder={currentPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { setIsFocused(true); triggerSearch(); }}
                  onBlur={() => { setIsFocused(false); setTimeout(() => setSearchResults([]), 200); }}
                  onKeyDown={(e) => {
                    if (!searchResults.length) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedIndex(i => Math.min(i + 1, searchResults.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedIndex(i => Math.max(i - 1, 0));
                    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                      e.preventDefault();
                      handlePlayerSelect(searchResults[highlightedIndex]);
                    } else if (e.key === 'Escape') {
                      setSearchResults([]);
                      setHighlightedIndex(-1);
                    }
                  }}
                />
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
                  </div>
                )}
              </div>

              {searchResults.length > 0 && isFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                  {searchResults.map((player, index) => (
                    <button
                      key={player.id}
                      className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between border-b border-slate-800/50 last:border-0 ${
                        index === highlightedIndex ? 'bg-slate-700' : 'hover:bg-slate-800'
                      }`}
                      onMouseDown={() => handlePlayerSelect(player)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="text-slate-100 font-medium">
                        {player.first_name} {player.last_name}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchError && (
                <div className="absolute top-full left-0 right-0 mt-2 text-red-400 text-sm text-center">
                  {searchError}
                </div>
              )}

              {pendingPlayer && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50 flex items-center justify-between">
                  <span className="text-slate-300 text-sm font-medium">This will end your current comparison. Continue?</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setPendingPlayer(null); setSearchQuery(''); }}
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
        )}

        {optimizeMode && <OptimizeLineup onClose={() => setOptimizeMode(false)} />}

        {/* ─── Team Builder ─────────────────────────────────────────────── */}
        {teamBuilderMode && !optimizeMode && (
          <>
            {teamBuilderError && (
              <div className="max-w-5xl mx-auto mb-4">
                <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium px-4 py-3 rounded-xl">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {teamBuilderError}
                </div>
              </div>
            )}
            <TeamBuilder
              ref={teamBuilderRef}
              teamSlots={teamSlots}
              currentSlot={currentSlot}
              setCurrentSlot={setCurrentSlot}
              onTeamBSlotChange={(slot) => setTeamBCurrentSlot(slot)}
              onFillSlot={(slot, data) => {
                setTeamSlots(prev => {
                  const next  = { ...prev, [slot]: data };
                  const slots = ['PG', 'SG', 'SF', 'PF', 'C'];
                  const idx   = slots.indexOf(slot);
                  for (let i = 1; i <= 5; i++) {
                    const check = slots[(idx + i) % 5];
                    if (!next[check]) { setCurrentSlot(check); break; }
                  }
                  return next;
                });
              }}
              onClearSlot={(slot) => {
                setTeamSlots(prev => ({ ...prev, [slot]: null }));
                setCurrentSlot(slot);
              }}
              onResetTeam={() => {
                setTeamSlots(EMPTY_TEAM_SLOTS);
                setCurrentSlot('PG');
                setIsComparingTeams(false);
              }}
              savedTeams={savedTeams}
              onSaveTeam={(team) => setSavedTeams(prev => [team, ...prev])}
              onUnsaveTeam={(teamId) => setSavedTeams(prev => prev.filter(t => t.id !== teamId))}
              isComparingTeams={isComparingTeams}
              onComparisonModeChange={setIsComparingTeams}
            />
          </>
        )}

        {/* ─── Player Panel / Comparison ────────────────────────────────── */}
        {!teamBuilderMode && !optimizeMode && selectedPlayer && (
          <div className="mb-16">
            {comparisonMode && comparisonPlayers.length > 1 ? (
              <ComparisonPanel
                comparisonPlayers={comparisonPlayers}
                onAddThird={() => {
                  setIsAddingToComparison(true);
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                onEndComparison={() => {
                  setSelectedPlayer(null);
                  setSearchQuery('');
                  setComparisonMode(false);
                  setComparisonPlayers([]);
                  setIsAddingToComparison(false);
                }}
                onRemovePlayer={(playerId) => {
                  const remaining = comparisonPlayers.filter(p => p.player.id !== playerId);
                  if (remaining.length === 1) {
                    setComparisonMode(false);
                    setComparisonPlayers([]);
                    setIsAddingToComparison(false);
                    setSelectedPlayer(remaining[0].player);
                    setSelectedPlayerStats(remaining[0].stats);
                    setSelectedPlayerDraftScore(remaining[0].draftScore);
                    setSelectedPlayerTrajectory(remaining[0].trajectory);
                    setSearchQuery(`${remaining[0].player.first_name} ${remaining[0].player.last_name}`);
                  } else {
                    setComparisonPlayers(remaining);
                    setIsAddingToComparison(true);
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }
                }}
              />
            ) : (
              <PlayerPanel
                selectedPlayer={selectedPlayer}
                selectedPlayerStats={selectedPlayerStats}
                isLoadingStats={isLoadingStats}
                selectedPlayerDraftScore={selectedPlayerDraftScore}
                isLoadingDraftScore={isLoadingDraftScore}
                selectedPlayerTrajectory={selectedPlayerTrajectory}
                isLoadingTrajectory={isLoadingTrajectory}
                isBookmarked={watchlist.some(p => p.id === selectedPlayer.id.toString())}
                onToggleBookmark={handleToggleBookmarkSelected}
                onStartComparison={() => {
                  setComparisonMode(true);
                  setIsAddingToComparison(true);
                  setComparisonPlayers([{
                    player:     selectedPlayer,
                    stats:      selectedPlayerStats,
                    draftScore: selectedPlayerDraftScore,
                    trajectory: selectedPlayerTrajectory,
                    isLoading:  false,
                  }]);
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                onClose={() => {
                  setSelectedPlayer(null);
                  setSearchQuery('');
                  setComparisonMode(false);
                  setComparisonPlayers([]);
                  setIsAddingToComparison(false);
                }}
              />
            )}
          </div>
        )}

        {/* ─── Watchlist ────────────────────────────────────────────────── */}
        {!teamBuilderMode && !optimizeMode && watchlist.length > 0 && (
          <div id="tour-watchlist" className="mb-16">
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

        {/* ─── Saved Teams ──────────────────────────────────────────────── */}
        {!teamBuilderMode && !optimizeMode && savedTeams.length > 0 && (
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
                    onClick={() => suppressTeamDeleteConfirm
                      ? setSavedTeams(prev => prev.filter(t => t.id !== team.id))
                      : setTeamToDelete(team.id)
                    }
                    className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 z-20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {teamToDelete === team.id && (
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center justify-center z-30 border border-slate-800">
                      <div className="text-slate-200 font-medium mb-4">Delete this team?</div>
                      <div className="flex gap-3 w-full mb-4">
                        <button
                          onClick={() => { setSavedTeams(prev => prev.filter(t => t.id !== team.id)); setTeamToDelete(null); }}
                          className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >Yes, delete</button>
                        <button
                          onClick={() => setTeamToDelete(null)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >Cancel</button>
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
                            <span className="text-slate-300 font-medium">
                              {data ? `${data.player.first_name} ${data.player.last_name}` : 'Empty'}
                            </span>
                          </div>
                          {data && <span className="text-xs font-bold text-slate-500">{data.player.position}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <div className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">DR: {team.scores.teamScore.toFixed(1)}</div>
                    <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">OFF: {team.scores.offRating.toFixed(1)}</div>
                    <div className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">DEF: {team.scores.defRating.toFixed(1)}</div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setTeamBuilderMode(true);
                        setOptimizeMode(false);
                        setTeamSlots(team.slots);
                        setCurrentSlot('PG');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Open in Builder <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Breakout Alerts ──────────────────────────────────────────── */}
        {!teamBuilderMode && !optimizeMode && (
          <div id="tour-breakout" className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100">Breakout Alerts</h2>
              </div>
              {!isLoadingBreakout && breakoutPlayers.length > 3 && (
                <button
                  onClick={() => setShowAllBreakout(prev => !prev)}
                  className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
                >
                  {showAllBreakout ? 'Show Less' : 'Load More'}
                </button>
              )}
            </div>
            {isLoadingBreakout ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800/50 h-40 animate-pulse">
                    <div className="flex gap-4 h-full">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl" />
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-4 bg-slate-800 rounded w-3/4" />
                        <div className="h-3 bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : breakoutError ? (
              <div className="text-rose-400 bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">{breakoutError}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleBreakoutPlayers.map(player => (
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

        {/* ─── Leaderboard ────────────────────────────────────────────── */}
        {!teamBuilderMode && !optimizeMode && (
          <div id="tour-prospects">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-100">🏆 Leaderboard</h2>
            </div>
            
            {isLoadingBatch ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800/50 h-40 animate-pulse">
                    <div className="flex gap-4 h-full">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl" />
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-4 bg-slate-800 rounded w-3/4" />
                        <div className="h-3 bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : batchError ? (
              <div className="text-rose-400 bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">{batchError}</div>
            ) : (
              <>
                <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 font-medium">#</th>
                        <th className="px-4 py-3 font-medium">Player</th>
                        <th className="px-4 py-3 font-medium text-right">PTS</th>
                        <th className="px-4 py-3 font-medium text-right">AST</th>
                        <th className="px-4 py-3 font-medium text-right">REB</th>
                        <th className="px-4 py-3 font-medium text-center">Trend</th>
                        <th className="px-4 py-3 font-medium text-right">DR Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.slice(0, visibleCount).map((player, index) => (
                        <tr 
                          key={player.id} 
                          onClick={() => handleSelectPlayerCard(player)}
                          className="border-t border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-4">
                            <span className="text-slate-500 font-mono text-sm">{index + 1}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                                alt={player.name}
                                className="w-10 h-10 rounded-full object-cover object-top bg-slate-800"
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-200">{player.name}</span>
                                  {player.position && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300 rounded-full">
                                      {abbreviatePosition(player.position)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500">{player.team}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-slate-200 font-semibold">{player.stats?.pts ?? '—'}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-slate-200 font-semibold">{player.stats?.ast ?? '—'}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-slate-200 font-semibold">{player.stats?.reb ?? '—'}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex justify-center">
                              <TrendIcon trend={player.trend} />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className={`text-lg font-bold ${player.score ? getScoreColor(player.score) : 'text-slate-500'}`}>
                                {player.score ? player.score : '—'}
                              </span>
                              {player.score && <span className="text-[10px] text-slate-500 font-medium">DR</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {players.length > 10 && (
                  <div className="mt-6 flex justify-center gap-3">
                    {visibleCount === 10 && players.length > 10 && (
                      <button
                        onClick={() => setVisibleCount(25)}
                        className="bg-slate-900 border border-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-slate-500 transition-colors"
                      >
                        Show 25
                      </button>
                    )}
                    {visibleCount === 25 && (
                      <button
                        onClick={() => setVisibleCount(10)}
                        className="bg-slate-900 border border-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-slate-500 transition-colors"
                      >
                        Show Less
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" strokeWidth={2.5} />
              <span className="text-base font-extrabold tracking-tight text-white">DraftRoom</span>
            </div>
            <a
              href="https://github.com/ashadsmh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 transition-colors text-sm flex items-center gap-1"
            >
              GitHub — ashadsmh <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          <div className="border-t border-slate-800 mt-6 pt-6">
            <p className="text-center text-xs text-slate-500">© 2026 DraftRoom</p>
          </div>
        </div>
      </footer>

      <TourOverlay
        isActive={isActive}
        onEnd={endTour}
      />
    </div>
  );
}