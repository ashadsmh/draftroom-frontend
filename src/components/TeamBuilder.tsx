import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AlertTriangle, X, Bookmark, RefreshCw } from 'lucide-react';
import { TeamSlot, SavedTeam } from '../types';
import { NbaPlayer } from '../api/nba';

export interface TeamBuilderRef {
  handleSlotSelection: (player: NbaPlayer, slotData: TeamSlot) => void;
  handleTeamBSlotSelection: (player: NbaPlayer, slotData: TeamSlot) => void;
  getActiveTeam: () => 'A' | 'B';
  getTeamBSlots: () => Record<string, TeamSlot | null>;
}

interface TeamBuilderProps {
  teamSlots: Record<string, TeamSlot | null>;
  currentSlot: string;
  setCurrentSlot: (slot: string) => void;
  onFillSlot: (slot: string, data: TeamSlot) => void;
  onClearSlot: (slot: string) => void;
  onResetTeam: () => void;
  savedTeams: SavedTeam[];
  onSaveTeam: (team: SavedTeam) => void;
  onUnsaveTeam: (teamId: number) => void;
  isComparingTeams?: boolean;
  onComparisonModeChange?: (isComparing: boolean) => void;
  onTeamBSlotChange?: (slot: string) => void;
}

const TeamBuilder = forwardRef<TeamBuilderRef, TeamBuilderProps>(({
  teamSlots,
  currentSlot,
  setCurrentSlot,
  onFillSlot,
  onClearSlot,
  onResetTeam,
  savedTeams,
  onSaveTeam,
  onUnsaveTeam,
  isComparingTeams,
  onComparisonModeChange,
  onTeamBSlotChange
}, ref) => {
  const [teamResult, setTeamResult] = useState<{ teamScore: number; offRating: number; defRating: number } | null>(null);
  const [mismatchWarning, setMismatchWarning] = useState<{ player: NbaPlayer; slot: string; data: TeamSlot; isTeamB?: boolean } | null>(null);
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false);
  const [suppressPositionWarnings, setSuppressPositionWarnings] = useState(false);
  const [isTeamSaved, setIsTeamSaved] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [showTeamNameInput, setShowTeamNameInput] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');

  const [internalComparisonMode, setInternalComparisonMode] = useState(false);
  const comparisonMode = isComparingTeams !== undefined ? isComparingTeams : internalComparisonMode;

  const [activeTeam, setActiveTeam] = useState<'A' | 'B'>('A');

  const handleSetComparisonMode = (mode: boolean) => {
    setInternalComparisonMode(mode);
    onComparisonModeChange?.(mode);
    if (mode) {
      onTeamBSlotChange?.('PG');
      setActiveTeam('B');
    } else {
      setActiveTeam('A');
    }
  };

  const [teamBSlots, setTeamBSlots] = useState<Record<string, TeamSlot | null>>({
    PG: null, SG: null, SF: null, PF: null, C: null
  });
  const [teamBCurrentSlot, setTeamBCurrentSlot] = useState<string>('PG');
  const [teamBResult, setTeamBResult] = useState<{ teamScore: number; offRating: number; defRating: number } | null>(null);
  const [showSavedTeamsPanel, setShowSavedTeamsPanel] = useState(false);

  const [isTeamBSaved, setIsTeamBSaved] = useState(false);
  const [currentTeamBId, setCurrentTeamBId] = useState<number | null>(null);
  const [showTeamBNameInput, setShowTeamBNameInput] = useState(false);
  const [teamBNameInput, setTeamBNameInput] = useState('');

  const handleFillSlot = (slot: string, data: TeamSlot) => {
    onFillSlot(slot, data);
    setIsTeamSaved(false);
    setCurrentTeamId(null);
    setShowTeamNameInput(false);
  };

  useImperativeHandle(ref, () => ({
    handleSlotSelection: (player: NbaPlayer, slotData: TeamSlot) => {
      const pos = player.position || '';
      let isMatch = false;
      if (currentSlot === 'PG' && (pos.includes('G') || pos === 'PG')) isMatch = true;
      else if (currentSlot === 'SG' && (pos.includes('G') || pos === 'SG')) isMatch = true;
      else if (currentSlot === 'SF' && (pos.includes('F') || pos === 'SF' || pos === 'F-C' || pos === 'C-F')) isMatch = true;
      else if (currentSlot === 'PF' && (pos.includes('F') || pos === 'PF' || pos === 'F-C' || pos === 'C-F')) isMatch = true;
      else if (currentSlot === 'C' && (pos.includes('C') || pos === 'C' || pos === 'F-C' || pos === 'C-F')) isMatch = true;

      if (!isMatch && !suppressPositionWarnings) {
        setMismatchWarning({ player, slot: currentSlot, data: slotData });
        setMismatchConfirmed(false);
      } else {
        // Always overwrites the current slot — no stacking
        handleFillSlot(currentSlot, slotData);
      }
    },
    handleTeamBSlotSelection: (player: NbaPlayer, slotData: TeamSlot) => {
      const pos = player.position || '';
      let isMatch = false;
      if (teamBCurrentSlot === 'PG' && (pos.includes('G') || pos === 'PG')) isMatch = true;
      else if (teamBCurrentSlot === 'SG' && (pos.includes('G') || pos === 'SG')) isMatch = true;
      else if (teamBCurrentSlot === 'SF' && (pos.includes('F') || pos === 'SF' || pos === 'F-C' || pos === 'C-F')) isMatch = true;
      else if (teamBCurrentSlot === 'PF' && (pos.includes('F') || pos === 'PF' || pos === 'F-C' || pos === 'C-F')) isMatch = true;
      else if (teamBCurrentSlot === 'C' && (pos.includes('C') || pos === 'C' || pos === 'F-C' || pos === 'C-F')) isMatch = true;

      if (!isMatch && !suppressPositionWarnings) {
        setMismatchWarning({ player, slot: teamBCurrentSlot, data: slotData, isTeamB: true });
        setMismatchConfirmed(false);
      } else {
        const slots = ['PG', 'SG', 'SF', 'PF', 'C'];
        const currentIndex = slots.indexOf(teamBCurrentSlot);
        setTeamBSlots(prev => {
          const next = { ...prev, [teamBCurrentSlot]: slotData };
          for (let i = 1; i <= 5; i++) {
            const checkSlot = slots[(currentIndex + i) % 5];
            if (!next[checkSlot]) {
              setTeamBCurrentSlot(checkSlot);
              onTeamBSlotChange?.(checkSlot);
              break;
            }
          }
          return next;
        });
        setIsTeamBSaved(false);
        setCurrentTeamBId(null);
        setShowTeamBNameInput(false);
      }
    },
    getActiveTeam: () => activeTeam,
    getTeamBSlots: () => teamBSlots
  }));

  const calculateTeamScore = (slots: Record<string, TeamSlot | null>) => {
    const pg = slots['PG'];
    const sg = slots['SG'];
    const sf = slots['SF'];
    const pf = slots['PF'];
    const c = slots['C'];

    if (!pg || !sg || !sf || !pf || !c) return null;

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

    return { teamScore, offRating, defRating };
  };

  useEffect(() => {
    if (Object.values(teamSlots).every(s => s !== null)) {
      setTeamResult(calculateTeamScore(teamSlots));
    } else {
      setTeamResult(null);
    }
  }, [teamSlots]);

  useEffect(() => {
    if (Object.values(teamBSlots).every(s => s !== null)) {
      setTeamBResult(calculateTeamScore(teamBSlots));
    } else {
      setTeamBResult(null);
    }
  }, [teamBSlots]);

  return (
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
              onClick={() => {
                if (mismatchWarning.isTeamB) {
                  const slots = ['PG', 'SG', 'SF', 'PF', 'C'];
                  const currentIndex = slots.indexOf(mismatchWarning.slot);
                  setTeamBSlots(prev => {
                    const next = { ...prev, [mismatchWarning.slot]: mismatchWarning.data };
                    for (let i = 1; i <= 5; i++) {
                      const checkSlot = slots[(currentIndex + i) % 5];
                      if (!next[checkSlot]) {
                        setTeamBCurrentSlot(checkSlot);
                        onTeamBSlotChange?.(checkSlot);
                        break;
                      }
                    }
                    return next;
                  });
                } else {
                  handleFillSlot(mismatchWarning.slot, mismatchWarning.data);
                }
                setMismatchWarning(null);
              }}
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
              onClick={() => {
                setCurrentSlot(slot);
                setActiveTeam('A');
              }}
              className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all relative ${isActive ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-slate-800 hover:border-slate-700'}`}
            >
              <div className="text-xs font-bold text-slate-500 mb-2">{slot}</div>
              {data ? (
                <div className="flex flex-col items-center text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearSlot(slot);
                      setCurrentSlot(slot);
                      setActiveTeam('A');
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

      {teamResult && comparisonMode && (
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 shadow-sm">
          <h2 className="text-lg font-bold text-white">Team A</h2>
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">DR:</span>
              <span className="text-purple-400">{teamResult.teamScore.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">OFF:</span>
              <span className="text-emerald-400">{teamResult.offRating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">DEF:</span>
              <span className="text-blue-400">{teamResult.defRating.toFixed(1)}</span>
            </div>
            <div className="relative ml-2">
              <button
                onClick={() => {
                  if (isTeamSaved) {
                    if (currentTeamId) onUnsaveTeam(currentTeamId);
                    setIsTeamSaved(false);
                    setCurrentTeamId(null);
                    setShowTeamNameInput(false);
                  } else {
                    setShowTeamNameInput(!showTeamNameInput);
                    if (!showTeamNameInput) setTeamNameInput('');
                  }
                }}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                  isTeamSaved
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title={isTeamSaved ? "Unsave Team" : "Save Team"}
              >
                <Bookmark className="w-4 h-4" fill={isTeamSaved ? "currentColor" : "none"} />
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
                        onSaveTeam({ id: newId, timestamp: Date.now(), slots: teamSlots, scores: teamResult, name: finalName });
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
                      onClick={() => { setShowTeamNameInput(false); setTeamNameInput(''); }}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const finalName = teamNameInput.trim() || `Team ${savedTeams.length + 1}`;
                        const newId = Date.now();
                        onSaveTeam({ id: newId, timestamp: Date.now(), slots: teamSlots, scores: teamResult, name: finalName });
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
          </div>
        </div>
      )}

      {teamResult && !comparisonMode && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-900/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Team Analysis</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => {
                    if (isTeamSaved) {
                      if (currentTeamId) onUnsaveTeam(currentTeamId);
                      setIsTeamSaved(false);
                      setCurrentTeamId(null);
                      setShowTeamNameInput(false);
                    } else {
                      setShowTeamNameInput(!showTeamNameInput);
                      if (!showTeamNameInput) setTeamNameInput('');
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
                          onSaveTeam({ id: newId, timestamp: Date.now(), slots: teamSlots, scores: teamResult, name: finalName });
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
                        onClick={() => { setShowTeamNameInput(false); setTeamNameInput(''); }}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const finalName = teamNameInput.trim() || `Team ${savedTeams.length + 1}`;
                          const newId = Date.now();
                          onSaveTeam({ id: newId, timestamp: Date.now(), slots: teamSlots, scores: teamResult, name: finalName });
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
              {!comparisonMode && (
                <button
                  onClick={() => handleSetComparisonMode(true)}
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Compare vs Another Team
                </button>
              )}
              {comparisonMode && (
                <button
                  onClick={() => {
                    handleSetComparisonMode(false);
                    setTeamBSlots({ PG: null, SG: null, SF: null, PF: null, C: null });
                    setTeamBCurrentSlot('PG');
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel Comparison
                </button>
              )}
              <button
                onClick={() => {
                  onResetTeam();
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

          {comparisonMode && !Object.values(teamBSlots).every(slot => slot !== null) && (
            <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center text-indigo-300 font-medium">
              Build or load Team B to compare
            </div>
          )}
        </div>
      )}

      {comparisonMode && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Team B</h2>
            <button
              onClick={() => setShowSavedTeamsPanel(!showSavedTeamsPanel)}
              className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {showSavedTeamsPanel ? 'Close Saved Teams' : 'Load Saved Team'}
            </button>
          </div>

          {showSavedTeamsPanel && (
            <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-400 mb-3">Select a Saved Team</h3>
              {savedTeams.length === 0 ? (
                <div className="text-sm text-slate-500 italic">No saved teams available.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {savedTeams.map(team => (
                    <div
                      key={team.id}
                      onClick={() => {
                        setTeamBSlots(team.slots);
                        setTeamBResult(team.scores);
                        setShowSavedTeamsPanel(false);
                      }}
                      className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-lg p-3 cursor-pointer transition-colors"
                    >
                      <div className="font-bold text-slate-200 mb-2">{team.name || `Team ${team.id}`}</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-purple-400">DR: {team.scores.teamScore.toFixed(1)}</span>
                        <span className="text-emerald-400">OFF: {team.scores.offRating.toFixed(1)}</span>
                        <span className="text-blue-400">DEF: {team.scores.defRating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-5 gap-4 mb-8">
            {['PG', 'SG', 'SF', 'PF', 'C'].map((slot) => {
              const data = teamBSlots[slot];
              const isActive = teamBCurrentSlot === slot;
              return (
                <div
                  key={`teamB-${slot}`}
                  onClick={() => {
                    setTeamBCurrentSlot(slot);
                    onTeamBSlotChange?.(slot);
                    setActiveTeam('B');
                  }}
                  className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all relative ${isActive ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="text-xs font-bold text-slate-500 mb-2">{slot}</div>
                  {data ? (
                    <div className="flex flex-col items-center text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTeamBSlots(prev => ({ ...prev, [slot]: null }));
                          setTeamBResult(null);
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
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
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

          {teamBResult && (
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 shadow-sm">
              <h2 className="text-lg font-bold text-white">Team B</h2>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">DR:</span>
                  <span className="text-purple-400">{teamBResult.teamScore.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">OFF:</span>
                  <span className="text-emerald-400">{teamBResult.offRating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">DEF:</span>
                  <span className="text-blue-400">{teamBResult.defRating.toFixed(1)}</span>
                </div>
                <div className="relative ml-2">
                  <button
                    onClick={() => {
                      if (isTeamBSaved) {
                        if (currentTeamBId) onUnsaveTeam(currentTeamBId);
                        setIsTeamBSaved(false);
                        setCurrentTeamBId(null);
                        setShowTeamBNameInput(false);
                      } else {
                        setShowTeamBNameInput(!showTeamBNameInput);
                        if (!showTeamBNameInput) setTeamBNameInput('');
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                      isTeamBSaved
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                    title={isTeamBSaved ? "Unsave Team B" : "Save Team B"}
                  >
                    <Bookmark className="w-4 h-4" fill={isTeamBSaved ? "currentColor" : "none"} />
                  </button>

                  {showTeamBNameInput && !isTeamBSaved && (
                    <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-10 w-64 flex flex-col gap-3">
                      <input
                        type="text"
                        placeholder={`Team B (${savedTeams.length + 1})`}
                        value={teamBNameInput}
                        onChange={(e) => setTeamBNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const finalName = teamBNameInput.trim() || `Team B (${savedTeams.length + 1})`;
                            const newId = Date.now();
                            onSaveTeam({ id: newId, timestamp: Date.now(), slots: teamBSlots, scores: teamBResult, name: finalName });
                            setIsTeamBSaved(true);
                            setCurrentTeamBId(newId);
                            setShowTeamBNameInput(false);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowTeamBNameInput(false); setTeamBNameInput(''); }}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            const finalName = teamBNameInput.trim() || `Team B (${savedTeams.length + 1})`;
                            const newId = Date.now();
                            onSaveTeam({ id: newId, timestamp: Date.now(), slots: teamBSlots, scores: teamBResult, name: finalName });
                            setIsTeamBSaved(true);
                            setCurrentTeamBId(newId);
                            setShowTeamBNameInput(false);
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {comparisonMode && teamResult && teamBResult && (
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-900/50">
          <div className={`text-center py-3 rounded-xl mb-6 font-bold text-lg ${
            teamResult.teamScore > teamBResult.teamScore 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : teamBResult.teamScore > teamResult.teamScore
              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}>
            {teamResult.teamScore > teamBResult.teamScore 
              ? 'Team A Wins'
              : teamBResult.teamScore > teamResult.teamScore
              ? 'Team B Wins'
              : 'Even Matchup'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* DR Score */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="text-sm font-medium text-slate-400 text-center mb-4">DraftRoom Team Score</div>
              <div className="flex justify-between items-center">
                <div className={`text-2xl font-black ${teamResult.teamScore >= teamBResult.teamScore ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {teamResult.teamScore.toFixed(1)}
                </div>
                <div className="text-xs font-bold text-slate-600">VS</div>
                <div className={`text-2xl font-black ${teamBResult.teamScore >= teamResult.teamScore ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {teamBResult.teamScore.toFixed(1)}
                </div>
              </div>
            </div>

            {/* OFF Rating */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="text-sm font-medium text-slate-400 text-center mb-4">Offensive Rating</div>
              <div className="flex justify-between items-center">
                <div className={`text-2xl font-black ${teamResult.offRating >= teamBResult.offRating ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {teamResult.offRating.toFixed(1)}
                </div>
                <div className="text-xs font-bold text-slate-600">VS</div>
                <div className={`text-2xl font-black ${teamBResult.offRating >= teamResult.offRating ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {teamBResult.offRating.toFixed(1)}
                </div>
              </div>
            </div>

            {/* DEF Rating (Lower is better) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="text-sm font-medium text-slate-400 text-center mb-4">Defensive Rating</div>
              <div className="flex justify-between items-center">
                <div className={`text-2xl font-black ${teamResult.defRating <= teamBResult.defRating ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {teamResult.defRating.toFixed(1)}
                </div>
                <div className="text-xs font-bold text-slate-600">VS</div>
                <div className={`text-2xl font-black ${teamBResult.defRating <= teamResult.defRating ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {teamBResult.defRating.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr] bg-slate-900 border-b border-slate-800 p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div className="text-left">Team A</div>
              <div className="text-center w-16">Pos</div>
              <div className="text-right">Team B</div>
            </div>
            <div className="divide-y divide-slate-800/50">
              {['PG', 'SG', 'SF', 'PF', 'C'].map(slot => {
                const playerA = teamSlots[slot];
                const playerB = teamBSlots[slot];
                if (!playerA || !playerB) return null;
                
                const scoreA = playerA.draftScore.draftroom_score;
                const scoreB = playerB.draftScore.draftroom_score;
                
                return (
                  <div key={`matchup-${slot}`} className="grid grid-cols-[1fr_auto_1fr] p-3 items-center hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
                        <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${playerA.player.id}.png`} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png'; }} referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-200">{playerA.player.first_name} {playerA.player.last_name}</span>
                        <span className={`text-xs font-bold ${scoreA >= scoreB ? 'text-emerald-400' : 'text-slate-500'}`}>{scoreA.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <div className="text-center w-16 text-xs font-black text-slate-600">{slot}</div>
                    
                    <div className="flex items-center gap-3 justify-end text-right">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-200">{playerB.player.first_name} {playerB.player.last_name}</span>
                        <span className={`text-xs font-bold ${scoreB >= scoreA ? 'text-emerald-400' : 'text-slate-500'}`}>{scoreB.toFixed(1)}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
                        <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${playerB.player.id}.png`} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png'; }} referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default TeamBuilder;