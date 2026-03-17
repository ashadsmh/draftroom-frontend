import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AlertTriangle, X, Bookmark, RefreshCw } from 'lucide-react';
import { TeamSlot, SavedTeam } from '../types';
import { NbaPlayer } from '../api/nba';

export interface TeamBuilderRef {
  handleSlotSelection: (player: NbaPlayer, slotData: TeamSlot) => void;
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
  onUnsaveTeam
}, ref) => {
  const [teamResult, setTeamResult] = useState<{ teamScore: number; offRating: number; defRating: number } | null>(null);
  const [mismatchWarning, setMismatchWarning] = useState<{ player: NbaPlayer; slot: string; data: TeamSlot } | null>(null);
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false);
  const [suppressPositionWarnings, setSuppressPositionWarnings] = useState(false);
  const [isTeamSaved, setIsTeamSaved] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [showTeamNameInput, setShowTeamNameInput] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');

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
    }
  }));

  useEffect(() => {
    if (Object.values(teamSlots).every(s => s !== null)) {
      calculateTeamScore(teamSlots);
    }
  }, [teamSlots]);

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
                handleFillSlot(mismatchWarning.slot, mismatchWarning.data);
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
              onClick={() => setCurrentSlot(slot)}
              className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all relative ${isActive ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-slate-800 hover:border-slate-700'}`}
            >
              <div className="text-xs font-bold text-slate-500 mb-2">{slot}</div>
              {data ? (
                <div className="flex flex-col items-center text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearSlot(slot);
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
        </div>
      )}
    </div>
  );
});

export default TeamBuilder;