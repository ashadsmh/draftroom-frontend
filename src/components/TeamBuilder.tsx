import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { AlertTriangle, X, Bookmark, RefreshCw } from 'lucide-react';
import { TeamSlot, SavedTeam } from '../types';
import { NbaPlayer } from '../api/nba';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;

const EMPTY_TEAM_SLOTS: Record<string, TeamSlot | null> = {
  PG: null, SG: null, SF: null, PF: null, C: null,
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Returns true when a player's position is a legal fit for the given slot. */
function positionMatchesSlot(pos: string, slot: string): boolean {
  switch (slot) {
    case 'PG': return pos.includes('G') || pos === 'PG';
    case 'SG': return pos.includes('G') || pos === 'SG';
    case 'SF': return pos.includes('F') || pos === 'SF' || pos === 'F-C' || pos === 'C-F';
    case 'PF': return pos.includes('F') || pos === 'PF' || pos === 'F-C' || pos === 'C-F';
    case 'C':  return pos.includes('C') || pos === 'C'  || pos === 'F-C' || pos === 'C-F';
    default:   return false;
  }
}

/** Advances to the next empty slot, cycling around if needed. */
function nextEmptySlot(
  slots: Record<string, TeamSlot | null>,
  currentSlot: string
): string | null {
  const idx = SLOTS.indexOf(currentSlot as typeof SLOTS[number]);
  for (let i = 1; i <= SLOTS.length; i++) {
    const candidate = SLOTS[(idx + i) % SLOTS.length];
    if (!slots[candidate]) return candidate;
  }
  return null;
}

/** Computes aggregate team scores from a full set of five slots. */
function calculateTeamScore(
  slots: Record<string, TeamSlot | null>
): { teamScore: number; offRating: number; defRating: number } | null {
  const pg = slots['PG'];
  const sg = slots['SG'];
  const sf = slots['SF'];
  const pf = slots['PF'];
  const c  = slots['C'];
  if (!pg || !sg || !sf || !pf || !c) return null;

  const teamScore = (
    pg.draftScore.draftroom_score * 1.15 +
    sg.draftScore.draftroom_score * 1.0  +
    sf.draftScore.draftroom_score * 1.0  +
    pf.draftScore.draftroom_score * 1.0  +
    c.draftScore.draftroom_score  * 1.15
  ) / 5.3;

  const offRaw =
    (pg.trajectory.PTS.value * 1.2 + sg.trajectory.PTS.value * 1.1 + sf.trajectory.PTS.value * 1.0 +
     pf.trajectory.PTS.value * 0.9 + c.trajectory.PTS.value  * 0.8) / 5 +
    (pg.trajectory.AST.value * 1.3 + sg.trajectory.AST.value * 1.1 + sf.trajectory.AST.value * 0.9 +
     pf.trajectory.AST.value * 0.8 + c.trajectory.AST.value  * 0.7) / 5;

  const defRaw =
    (pg.stats.stl * 1.2 + sg.stats.stl * 1.1 + sf.stats.stl * 1.0 + pf.stats.stl * 1.0 + c.stats.stl * 0.8) / 5 +
    (pg.stats.blk * 0.7 + sg.stats.blk * 0.8 + sf.stats.blk * 0.9 + pf.stats.blk * 1.1 + c.stats.blk * 1.3) / 5 +
    ((pg.stats.reb + sg.stats.reb + sf.stats.reb + pf.stats.reb + c.stats.reb) / 5) * 0.3;

  return {
    teamScore,
    offRating: 100 + (offRaw / 45.0) * 30,
    defRating: 125 - (defRaw / 8.0)  * 25,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SlotCardProps {
  slot: string;
  data: TeamSlot | null;
  isActive: boolean;
  accentClass: string; // e.g. 'border-purple-500 shadow-[...]'
  drBadgeClass: string; // e.g. 'bg-purple-500/10 border-purple-500/20 text-purple-400'
  onClick: () => void;
  onClear: () => void;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, data, isActive, accentClass, drBadgeClass, onClick, onClear }) => (
  <div
    onClick={onClick}
    className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all relative ${
      isActive ? accentClass : 'border-slate-800 hover:border-slate-700'
    }`}
  >
    <div className="text-xs font-bold text-slate-500 mb-2">{slot}</div>
    {data ? (
      <div className="flex flex-col items-center text-center">
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden mb-2 border border-slate-700">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/260x190/${data.player.id}.png`}
            alt={`${data.player.first_name} ${data.player.last_name}`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png'; }}
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="text-sm font-bold text-slate-200 line-clamp-1">
          {data.player.first_name} {data.player.last_name}
        </div>
        <div className="text-xs text-slate-400 mb-2">{data.player.position || 'N/A'}</div>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${drBadgeClass}`}>
          DR: {data.draftScore.draftroom_score.toFixed(1)}
        </div>
      </div>
    ) : (
      <div className="h-24 flex items-center justify-center text-slate-600 text-sm italic">Empty</div>
    )}
  </div>
);

interface SaveTeamButtonProps {
  isSaved: boolean;
  showInput: boolean;
  nameInput: string;
  savedTeams: SavedTeam[];
  onToggle: () => void;
  onNameChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancelInput: () => void;
  size?: 'sm' | 'md';
  accentClass?: string;
}

/** Bookmark button + inline save-name popover, reused for both Team A and Team B. */
const SaveTeamButton: React.FC<SaveTeamButtonProps> = ({
  isSaved, showInput, nameInput, savedTeams,
  onToggle, onNameChange, onKeyDown, onSave, onCancelInput,
  size = 'md', accentClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
}) => {
  const padding  = size === 'sm' ? 'p-1.5' : 'p-2';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`${padding} rounded-xl transition-colors flex items-center justify-center ${
          isSaved ? accentClass : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
        }`}
        title={isSaved ? 'Unsave Team' : 'Save Team'}
      >
        <Bookmark className={iconSize} fill={isSaved ? 'currentColor' : 'none'} />
      </button>

      {showInput && !isSaved && (
        <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-10 w-64 flex flex-col gap-3">
          <input
            type="text"
            placeholder={`Team ${savedTeams.length + 1}`}
            value={nameInput}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={onCancelInput}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TeamBuilder = forwardRef<TeamBuilderRef, TeamBuilderProps>(({
  teamSlots, currentSlot, setCurrentSlot,
  onFillSlot, onClearSlot, onResetTeam,
  savedTeams, onSaveTeam, onUnsaveTeam,
  isComparingTeams, onComparisonModeChange, onTeamBSlotChange,
}, ref) => {

  const teamResult = useMemo(() => calculateTeamScore(teamSlots), [teamSlots]);
  const [mismatchWarning, setMismatchWarning] = useState<{
    player: NbaPlayer; slot: string; data: TeamSlot; isTeamB?: boolean;
  } | null>(null);
  const [mismatchConfirmed, setMismatchConfirmed]     = useState(false);
  const [suppressPositionWarnings, setSuppressPositionWarnings] = useState(false);

  // Team A save state
  const [isTeamSaved, setIsTeamSaved]         = useState(false);
  const [currentTeamId, setCurrentTeamId]     = useState<number | null>(null);
  const [showTeamNameInput, setShowTeamNameInput] = useState(false);
  const [teamNameInput, setTeamNameInput]     = useState('');

  // Team B state
  const [teamBSlots, setTeamBSlots]           = useState<Record<string, TeamSlot | null>>(EMPTY_TEAM_SLOTS);
  const [teamBCurrentSlot, setTeamBCurrentSlot] = useState<string>('PG');
  const teamBResult = useMemo(() => calculateTeamScore(teamBSlots), [teamBSlots]);
  const [isTeamBSaved, setIsTeamBSaved]       = useState(false);
  const [currentTeamBId, setCurrentTeamBId]   = useState<number | null>(null);
  const [showTeamBNameInput, setShowTeamBNameInput] = useState(false);
  const [teamBNameInput, setTeamBNameInput]   = useState('');

  // Comparison / active team
  const [internalComparisonMode, setInternalComparisonMode] = useState(false);
  const comparisonMode = isComparingTeams !== undefined ? isComparingTeams : internalComparisonMode;
  const [activeTeam, setActiveTeam]           = useState<'A' | 'B'>('A');
  const [showSavedTeamsPanel, setShowSavedTeamsPanel] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const resetTeamASaveState = () => {
    setIsTeamSaved(false);
    setCurrentTeamId(null);
    setShowTeamNameInput(false);
  };

  const handleFillSlot = (slot: string, data: TeamSlot) => {
    onFillSlot(slot, data);
    resetTeamASaveState();
  };

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

  // Shared slot-filling logic for both teams, deduplicating the two
  // nearly-identical handlers that existed before.
  const fillSlotForTeam = (
    team: 'A' | 'B',
    player: NbaPlayer,
    slotData: TeamSlot,
    targetSlot: string
  ) => {
    const pos = player.position || '';
    const isMatch = positionMatchesSlot(pos, targetSlot);

    if (!isMatch && !suppressPositionWarnings) {
      setMismatchWarning({ player, slot: targetSlot, data: slotData, isTeamB: team === 'B' });
      setMismatchConfirmed(false);
      return;
    }

    if (team === 'A') {
      handleFillSlot(targetSlot, slotData);
    } else {
      setTeamBSlots(prev => {
        const next      = { ...prev, [targetSlot]: slotData };
        const nextEmpty = nextEmptySlot(next, targetSlot);
        if (nextEmpty) {
          setTeamBCurrentSlot(nextEmpty);
          onTeamBSlotChange?.(nextEmpty);
        }
        return next;
      });
      setIsTeamBSaved(false);
      setCurrentTeamBId(null);
      setShowTeamBNameInput(false);
    }
  };

  // ─── Imperative handle ────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    handleSlotSelection:  (player, slotData) => fillSlotForTeam('A', player, slotData, currentSlot),
    handleTeamBSlotSelection: (player, slotData) => fillSlotForTeam('B', player, slotData, teamBCurrentSlot),
    getActiveTeam:  () => activeTeam,
    getTeamBSlots:  () => teamBSlots,
  }));

  // ─── Save-team helpers ────────────────────────────────────────────────────

  const buildSaveHandler = (
    slots: Record<string, TeamSlot | null>,
    result: NonNullable<ReturnType<typeof calculateTeamScore>>,
    nameInput: string,
    setIsSaved: (v: boolean) => void,
    setId: (v: number) => void,
    setShowInput: (v: boolean) => void,
    fallbackName?: string
  ) => () => {
    const finalName = nameInput.trim() || fallbackName || `Team ${savedTeams.length + 1}`;
    const newId = Date.now();
    onSaveTeam({ id: newId, timestamp: newId, slots, scores: result, name: finalName });
    setIsSaved(true);
    setId(newId);
    setShowInput(false);
  };

  const handleSaveTeamA = buildSaveHandler(
    teamSlots, teamResult!,
    teamNameInput, setIsTeamSaved, setCurrentTeamId, setShowTeamNameInput
  );

  const handleSaveTeamB = buildSaveHandler(
    teamBSlots, teamBResult!,
    teamBNameInput, setIsTeamBSaved, setCurrentTeamBId, setShowTeamBNameInput,
    `Team B (${savedTeams.length + 1})`
  );

  // ─── Confirm mismatch ─────────────────────────────────────────────────────

  const confirmMismatch = () => {
    if (!mismatchWarning) return;
    const { isTeamB, slot, data, player } = mismatchWarning;
    if (isTeamB) {
      setTeamBSlots(prev => {
        const next      = { ...prev, [slot]: data };
        const nextEmpty = nextEmptySlot(next, slot);
        if (nextEmpty) { setTeamBCurrentSlot(nextEmpty); onTeamBSlotChange?.(nextEmpty); }
        return next;
      });
    } else {
      handleFillSlot(slot, data);
    }
    setMismatchWarning(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 mb-16">

      {/* Position mismatch warning */}
      {mismatchWarning && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-amber-400 font-semibold mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Position Mismatch Warning
            </h3>
            <p className="text-amber-200/70 text-sm mb-3">
              {mismatchWarning.player.first_name} {mismatchWarning.player.last_name} is listed as{' '}
              {mismatchWarning.player.position || 'Unknown'}, but you are placing them in the{' '}
              {mismatchWarning.slot} slot. This may negatively impact your team's Defensive Rating.
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
              onClick={confirmMismatch}
              className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* ─── Team A slots ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {SLOTS.map(slot => (
          <SlotCard
            key={slot}
            slot={slot}
            data={teamSlots[slot]}
            isActive={currentSlot === slot}
            accentClass="border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
            drBadgeClass="bg-purple-500/10 border-purple-500/20 text-purple-400"
            onClick={() => { setCurrentSlot(slot); setActiveTeam('A'); }}
            onClear={() => {
              onClearSlot(slot);
              setCurrentSlot(slot);
              setActiveTeam('A');
              resetTeamASaveState();
            }}
          />
        ))}
      </div>

      {/* Team A score bar (comparison mode) */}
      {teamResult && comparisonMode && (
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 shadow-sm">
          <h2 className="text-lg font-bold text-white">Team A</h2>
          <div className="flex items-center gap-4 text-sm font-medium">
            <ScorePill label="DR"  value={teamResult.teamScore} color="text-purple-400" />
            <ScorePill label="OFF" value={teamResult.offRating} color="text-emerald-400" />
            <ScorePill label="DEF" value={teamResult.defRating} color="text-blue-400" />
            <SaveTeamButton
              isSaved={isTeamSaved}
              showInput={showTeamNameInput}
              nameInput={teamNameInput}
              savedTeams={savedTeams}
              onToggle={() => {
                if (isTeamSaved) { if (currentTeamId) onUnsaveTeam(currentTeamId); resetTeamASaveState(); }
                else { setShowTeamNameInput(v => { if (!v) setTeamNameInput(''); return !v; }); }
              }}
              onNameChange={setTeamNameInput}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTeamA(); }}
              onSave={handleSaveTeamA}
              onCancelInput={() => { setShowTeamNameInput(false); setTeamNameInput(''); }}
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Team A analysis panel (solo mode) */}
      {teamResult && !comparisonMode && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-900/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Team Analysis</h2>
            <div className="flex items-center gap-4">
              <SaveTeamButton
                isSaved={isTeamSaved}
                showInput={showTeamNameInput}
                nameInput={teamNameInput}
                savedTeams={savedTeams}
                onToggle={() => {
                  if (isTeamSaved) { if (currentTeamId) onUnsaveTeam(currentTeamId); resetTeamASaveState(); }
                  else { setShowTeamNameInput(v => { if (!v) setTeamNameInput(''); return !v; }); }
                }}
                onNameChange={setTeamNameInput}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTeamA(); }}
                onSave={handleSaveTeamA}
                onCancelInput={() => { setShowTeamNameInput(false); setTeamNameInput(''); }}
              />
              <button
                onClick={() => handleSetComparisonMode(true)}
                className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Compare vs Another Team
              </button>
              <button
                onClick={() => {
                  onResetTeam();
                  setSuppressPositionWarnings(false);
                  resetTeamASaveState();
                }}
                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Team
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RatingCard label="DraftRoom Team Score" value={teamResult.teamScore} borderColor="border-purple-500/20" textColor="text-purple-400" />
            <RatingCard label="Offensive Rating"     value={teamResult.offRating} borderColor="border-emerald-500/20" textColor="text-emerald-400" />
            <RatingCard label="Defensive Rating"     value={teamResult.defRating} borderColor="border-blue-500/20"    textColor="text-blue-400" note="(lower is better)" />
          </div>
          {comparisonMode && !Object.values(teamBSlots).every(s => s !== null) && (
            <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center text-indigo-300 font-medium">
              Build or load Team B to compare
            </div>
          )}
        </div>
      )}

      {/* ─── Team B ────────────────────────────────────────────────────── */}
      {comparisonMode && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Team B</h2>
            <button
              onClick={() => setShowSavedTeamsPanel(v => !v)}
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
                      onClick={() => { setTeamBSlots(team.slots); setShowSavedTeamsPanel(false); }}
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
            {SLOTS.map(slot => (
              <SlotCard
                key={`teamB-${slot}`}
                slot={slot}
                data={teamBSlots[slot]}
                isActive={teamBCurrentSlot === slot}
                accentClass="border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                drBadgeClass="bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                onClick={() => { setTeamBCurrentSlot(slot); onTeamBSlotChange?.(slot); setActiveTeam('B'); }}
                onClear={() => { setTeamBSlots(prev => ({ ...prev, [slot]: null })); }}
              />
            ))}
          </div>

          {teamBResult && (
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 shadow-sm">
              <h2 className="text-lg font-bold text-white">Team B</h2>
              <div className="flex items-center gap-4 text-sm font-medium">
                <ScorePill label="DR"  value={teamBResult.teamScore} color="text-purple-400" />
                <ScorePill label="OFF" value={teamBResult.offRating} color="text-emerald-400" />
                <ScorePill label="DEF" value={teamBResult.defRating} color="text-blue-400" />
                <SaveTeamButton
                  isSaved={isTeamBSaved}
                  showInput={showTeamBNameInput}
                  nameInput={teamBNameInput}
                  savedTeams={savedTeams}
                  onToggle={() => {
                    if (isTeamBSaved) { if (currentTeamBId) onUnsaveTeam(currentTeamBId); setIsTeamBSaved(false); setCurrentTeamBId(null); setShowTeamBNameInput(false); }
                    else { setShowTeamBNameInput(v => { if (!v) setTeamBNameInput(''); return !v; }); }
                  }}
                  onNameChange={setTeamBNameInput}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTeamB(); }}
                  onSave={handleSaveTeamB}
                  onCancelInput={() => { setShowTeamBNameInput(false); setTeamBNameInput(''); }}
                  size="sm"
                  accentClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Head-to-head comparison ───────────────────────────────────── */}
      {comparisonMode && teamResult && teamBResult && (
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-900/50">
          <div className={`text-center py-3 rounded-xl mb-6 font-bold text-lg ${
            teamResult.teamScore > teamBResult.teamScore
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : teamBResult.teamScore > teamResult.teamScore
              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}>
            {teamResult.teamScore > teamBResult.teamScore ? 'Team A Wins'
              : teamBResult.teamScore > teamResult.teamScore ? 'Team B Wins'
              : 'Even Matchup'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <MatchupStat label="DraftRoom Team Score" aVal={teamResult.teamScore}  bVal={teamBResult.teamScore}  higherWins />
            <MatchupStat label="Offensive Rating"     aVal={teamResult.offRating}  bVal={teamBResult.offRating}  higherWins />
            <MatchupStat label="Defensive Rating"     aVal={teamResult.defRating}  bVal={teamBResult.defRating}  higherWins={false} />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr] bg-slate-900 border-b border-slate-800 p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div className="text-left">Team A</div>
              <div className="text-center w-16">Pos</div>
              <div className="text-right">Team B</div>
            </div>
            <div className="divide-y divide-slate-800/50">
              {SLOTS.map(slot => {
                const playerA = teamSlots[slot];
                const playerB = teamBSlots[slot];
                if (!playerA || !playerB) return null;
                const scoreA = playerA.draftScore.draftroom_score;
                const scoreB = playerB.draftScore.draftroom_score;
                return (
                  <div key={`matchup-${slot}`} className="grid grid-cols-[1fr_auto_1fr] p-3 items-center hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar id={playerA.player.id} />
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
                      <PlayerAvatar id={playerB.player.id} />
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

// ─── Tiny presentational helpers ─────────────────────────────────────────────

const ScorePill = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center gap-1">
    <span className="text-slate-400">{label}:</span>
    <span className={color}>{value.toFixed(1)}</span>
  </div>
);

const RatingCard = ({ label, value, borderColor, textColor, note }: {
  label: string; value: number; borderColor: string; textColor: string; note?: string;
}) => (
  <div className={`bg-slate-950 border ${borderColor} rounded-xl p-6 flex flex-col items-center justify-center text-center`}>
    <div className={`text-sm font-medium ${textColor} mb-2`}>{label}</div>
    {note && <div className="text-xs text-slate-500 mb-2">{note}</div>}
    <div className="text-4xl font-black text-white">{value.toFixed(1)}</div>
  </div>
);

const MatchupStat = ({ label, aVal, bVal, higherWins }: {
  label: string; aVal: number; bVal: number; higherWins: boolean;
}) => {
  const aWins = higherWins ? aVal >= bVal : aVal <= bVal;
  const bWins = higherWins ? bVal >= aVal : bVal <= aVal;
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
      <div className="text-sm font-medium text-slate-400 text-center mb-4">{label}</div>
      <div className="flex justify-between items-center">
        <div className={`text-2xl font-black ${aWins ? 'text-emerald-400' : 'text-slate-500'}`}>{aVal.toFixed(1)}</div>
        <div className="text-xs font-bold text-slate-600">VS</div>
        <div className={`text-2xl font-black ${bWins ? 'text-emerald-400' : 'text-slate-500'}`}>{bVal.toFixed(1)}</div>
      </div>
    </div>
  );
};

const PlayerAvatar = ({ id }: { id: number }) => (
  <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
    <img
      src={`https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`}
      alt=""
      className="w-full h-full object-cover"
      onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png'; }}
      referrerPolicy="no-referrer"
    />
  </div>
);

export default TeamBuilder;