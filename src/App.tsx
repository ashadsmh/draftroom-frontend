import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, TrendingUp, Star, ChevronRight, Loader2, X, Bookmark, AlertTriangle, Zap, BarChart2 } from 'lucide-react';
import { getComputedAverages, NbaPlayer, getDraftRoomScore, getTrajectory, getPlayerInfo } from './api/nba';
import PlayerCard, { abbreviatePosition } from './components/PlayerCard';
import PlayerPanel from './components/PlayerPanel';
import ComparisonPanel from './components/ComparisonPanel';
import TeamBuilder, { TeamBuilderRef } from './components/TeamBuilder';
import OptimizeLineup from './components/OptimizeLineup';
import TourOverlay from './components/TourOverlay';
import UserMenu from './components/UserMenu';
import { useSearch } from './hooks/useSearch';
import { usePlayerData } from './hooks/usePlayerData';
import { useTour, LEBRON_ID } from './hooks/useTour';
import { useAuth } from './hooks/useAuth';
import { useFirestoreData } from './hooks/useFirestoreData';
import { ComparisonPlayer, TeamSlot, Player, SavedTeam } from './types';

const LEBRON: Player = {
  id: LEBRON_ID,
  name: 'LeBron James',
  position: 'PF',
  team: 'LAL',
  score: null,
  stats: null,
  trend: null,
};

export default function App() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    searchError,
  } = useSearch();

  const { user, isLoading: isAuthLoading, signInWithGoogle, signOutUser } = useAuth();
  const { watchlist, setWatchlist, savedTeams, setSavedTeams } = useFirestoreData(user);

  const [placeholder, setPlaceholder] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const typeState = useRef({ index: 0, text: '', isDeleting: false });

  const [selectedPlayer, setSelectedPlayer] = useState<NbaPlayer | null>(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<any>(null);
  const [selectedPlayerDraftScore, setSelectedPlayerDraftScore] = useState<any>(null);
  const [selectedPlayerTrajectory, setSelectedPlayerTrajectory] = useState<any>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [breakoutPlayers, setBreakoutPlayers] = useState<Player[]>([]);

  const {
    isLoadingStats,
    isLoadingDraftScore,
    isLoadingTrajectory
  } = usePlayerData({
    selectedPlayer,
    setSelectedPlayer,
    onStatsLoaded: (stats) => {
      setSelectedPlayerStats(stats);
      const updateStats = (pList: Player[]) => pList.map(p =>
        p.id === selectedPlayer?.id.toString()
          ? { ...p, stats: { pts: stats.pts || 0, ast: stats.ast || 0, reb: stats.reb || 0 } }
          : p
      );
      setPlayers(updateStats);
      setBreakoutPlayers(updateStats);
    },
    onScoreLoaded: (score) => {
      setSelectedPlayerDraftScore(score);
      const updateScore = (pList: Player[]) => pList.map(p =>
        p.id === selectedPlayer?.id.toString()
          ? { ...p, score: score.draftroom_score }
          : p
      );
      setPlayers(updateScore);
      setBreakoutPlayers(updateScore);
    },
    onTrajectoryLoaded: (traj) => {
      setSelectedPlayerTrajectory(traj);
      const updateTrend = (pList: Player[]) => pList.map(p =>
        p.id === selectedPlayer?.id.toString()
          ? { ...p, trend: traj.DraftRoomScore.trend }
          : p
      );
      setPlayers(updateTrend);
      setBreakoutPlayers(updateTrend);
    }
  });

  const [isLoadingBatch, setIsLoadingBatch] = useState(true);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [selectedPosition, setSelectedPosition] = useState('All Positions');
  const [selectedSort, setSelectedSort] = useState('Highest Score');

  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonPlayers, setComparisonPlayers] = useState<ComparisonPlayer[]>([]);
  const [isAddingToComparison, setIsAddingToComparison] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState<NbaPlayer | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const teamBuilderRef = useRef<TeamBuilderRef>(null);

  const [teamBuilderError, setTeamBuilderError] = useState<string | null>(null);
  const [teamBuilderMode, setTeamBuilderMode] = useState(false);
  const [optimizeMode, setOptimizeMode] = useState(false);
  const [isComparingTeams, setIsComparingTeams] = useState(false);
  const [teamSlots, setTeamSlots] = useState<Record<string, TeamSlot | null>>({
    PG: null, SG: null, SF: null, PF: null, C: null
  });
  const [currentSlot, setCurrentSlot] = useState<string>('PG');
  const [teamBCurrentSlot, setTeamBCurrentSlot] = useState<string>('PG');
  const [suppressTeamDeleteConfirm, setSuppressTeamDeleteConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);

  const handleTourStart = useCallback(() => {
    setWatchlist(prev =>
      prev.some(p => p.id === LEBRON_ID) ? prev : [...prev, LEBRON]
    );
  }, [setWatchlist]);

  const handleTourEnd = useCallback(() => {}, []);

  const { isActive, currentStep, startTour, endTour, nextStep, prevStep } = useTour(
    handleTourStart,
    handleTourEnd
  );

  const toggleBookmark = (player: Player) => {
    setWatchlist(prev =>
      prev.some(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const handleToggleBookmarkSelected = () => {
    if (!selectedPlayer) return;
    const playerObj: Player = {
      id: selectedPlayer.id.toString(),
      name: `${selectedPlayer.first_name} ${selectedPlayer.last_name}`,
      position: abbreviatePosition(selectedPlayer.position || ''),
      team: selectedPlayer.team.full_name,
      score: selectedPlayerDraftScore?.draftroom_score ?? null,
      stats: selectedPlayerStats
        ? { pts: selectedPlayerStats.pts ?? 0, ast: selectedPlayerStats.ast ?? 0, reb: selectedPlayerStats.reb ?? 0 }
        : null,
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
    const nbaPlayer: NbaPlayer = {
      id: parseInt(player.id),
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' '),
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

  const fetchComparisonData = async (player: NbaPlayer) => {
    let position = player.position;
    let team = player.team;
    if (!position || team.full_name === 'NBA') {
      try {
        const info = await getPlayerInfo(player.id);
        if (info?.CommonPlayerInfo?.length > 0) {
          const pInfo = info.CommonPlayerInfo[0];
          position = pInfo.POSITION;
          team = { full_name: `${pInfo.TEAM_CITY} ${pInfo.TEAM_NAME}`.trim() };
        }
      } catch (err) { console.error(err); }
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

  const handlePlayerSelect = (player: NbaPlayer, force: boolean = false) => {
    if (teamBuilderMode) {
      setSearchQuery('');
      setSearchResults([]);
      const fetchAndFill = async () => {
        setTeamBuilderError(null);
        const activeTeam = teamBuilderRef.current?.getActiveTeam();
        const slotsToCheck = (isComparingTeams && activeTeam === 'B')
          ? (teamBuilderRef.current?.getTeamBSlots() ?? {})
          : teamSlots;
        const alreadyInTeam = Object.values(slotsToCheck).some(
          (slot: any) => slot?.player.id === player.id
        );
        if (alreadyInTeam) {
          setTeamBuilderError(`${player.first_name} ${player.last_name} is already on your team.`);
          setTimeout(() => setTeamBuilderError(null), 3000);
          return;
        }
        let position = player.position;
        let team = player.team;
        if (!position || team.full_name === 'NBA') {
          try {
            const info = await getPlayerInfo(player.id);
            if (info?.CommonPlayerInfo?.length > 0) {
              const pInfo = info.CommonPlayerInfo[0];
              position = pInfo.POSITION;
              team = { full_name: `${pInfo.TEAM_CITY} ${pInfo.TEAM_NAME}`.trim() };
            }
          } catch (err) { console.error(err); }
        }
        const updatedPlayer = { ...player, position, team };
        const [draftScore, trajectory, stats] = await Promise.all([
          getDraftRoomScore(player.id),
          getTrajectory(player.id),
          getComputedAverages(player.id)
        ]);
        if (!draftScore || !trajectory || !stats) {
          setTeamBuilderError(`No stats available for ${player.first_name} ${player.last_name} — player may be inactive or retired.`);
          setTimeout(() => setTeamBuilderError(null), 4000);
          return;
        }
        const slotData: TeamSlot = { player: updatedPlayer, draftScore, trajectory, stats };
        if (isComparingTeams && activeTeam === 'B') {
          teamBuilderRef.current?.handleTeamBSlotSelection(updatedPlayer, slotData);
        } else {
          teamBuilderRef.current?.handleSlotSelection(updatedPlayer, slotData);
        }
      };
      fetchAndFill();
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
    setOptimizeMode(false);
    setTeamSlots({ PG: null, SG: null, SF: null, PF: null, C: null });
    setCurrentSlot('PG');
    setTeamBuilderError(null);
    setTeamToDelete(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeTeam = teamBuilderMode ? (teamBuilderRef.current?.getActiveTeam() ?? 'A') : 'A';
  const activeSlot = (teamBuilderMode && isComparingTeams && activeTeam === 'B') ? teamBCurrentSlot : currentSlot;
  const slotLabel = activeSlot === 'PG' ? 'Point Guard' : activeSlot === 'SG' ? 'Shooting Guard' : activeSlot === 'SF' ? 'Small Forward' : activeSlot === 'PF' ? 'Power Forward' : 'Center';
  const teamLabel = (teamBuilderMode && isComparingTeams) ? (activeTeam === 'B' ? ' for Team B' : ' for Team A') : '';

  const currentPlaceholder = isFocused ? '' : (
    teamBuilderMode
      ? `Search your ${slotLabel}${teamLabel}...`
      : isAddingToComparison && comparisonPlayers.length === 1
      ? "Search for a second player..."
      : isAddingToComparison && comparisonPlayers.length === 2
      ? "Search for a third player..."
      : placeholder
  );

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-indigo-500/30">

      {/* Navigation */}
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

            {/* Auth */}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
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
                    <div className="text-xs text-slate-500">Efficiency metric: TS%, Playmaking, Defense, Foul Draw & Volume</div>
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

            <div className="relative w-full max-w-2xl">
              {isAddingToComparison && (
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  {comparisonPlayers.length === 0
                    ? `Search for a player to compare`
                    : comparisonPlayers.length === 1
                    ? `Comparing against ${comparisonPlayers[0].player.first_name} ${comparisonPlayers[0].player.last_name} — search a replacement`
                    : `Add a third player to compare`}
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

              {searchResults.length > 0 && isFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                  {searchResults.map((player) => (
                    <button
                      key={player.id}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors flex items-center justify-between border-b border-slate-800/50 last:border-0"
                      onMouseDown={() => handlePlayerSelect(player)}
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
                  const next = { ...prev, [slot]: data };
                  const slots = ['PG', 'SG', 'SF', 'PF', 'C'];
                  const currentIndex = slots.indexOf(slot);
                  for (let i = 1; i <= 5; i++) {
                    const checkSlot = slots[(currentIndex + i) % 5];
                    if (!next[checkSlot]) { setCurrentSlot(checkSlot); break; }
                  }
                  return next;
                });
              }}
              onClearSlot={(slot) => {
                setTeamSlots(prev => ({ ...prev, [slot]: null }));
                setCurrentSlot(slot);
              }}
              onResetTeam={() => {
                setTeamSlots({ PG: null, SG: null, SF: null, PF: null, C: null });
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
                    player: selectedPlayer,
                    stats: selectedPlayerStats,
                    draftScore: selectedPlayerDraftScore,
                    trajectory: selectedPlayerTrajectory,
                    isLoading: false
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
                          <div className="flex items-center gap-3">
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

        {!teamBuilderMode && !optimizeMode && (
          <div id="tour-breakout" className="mb-16">
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
              <div className="text-rose-400 bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">{batchError}</div>
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

        {!teamBuilderMode && !optimizeMode && (
          <div id="tour-prospects">
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
              <div className="text-rose-400 bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">{batchError}</div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
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
        currentStep={currentStep}
        onNext={nextStep}
        onPrev={prevStep}
        onEnd={endTour}
      />
    </div>
  );
}