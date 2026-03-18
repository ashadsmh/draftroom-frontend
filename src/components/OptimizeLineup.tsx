import React, { useState, useRef, useCallback } from 'react';
import {
  Loader2, TrendingUp, TrendingDown, Minus, X,
  ChevronDown, ChevronUp, AlertTriangle, Zap, Check
} from 'lucide-react';
import { getScoreColor, getScoreBg } from '../types';
import { optimizeLineup, OptimizedPlayer, OptimizeLineupResponse, searchPlayers, NbaPlayer } from '../api/nba';

interface OptimizeLineupProps {
  onClose: () => void;
}

interface ResolvedTag {
  input: string;
  player: NbaPlayer | null;
  status: 'resolving' | 'found' | 'not_found';
}

// ─── Nickname map ─────────────────────────────────────────────────────────────

const NICKNAMES: Record<string, string> = {
  'wemby': 'Victor Wembanyama',
  'joker': 'Nikola Jokic',
  'jokic': 'Nikola Jokic',
  'curry': 'Stephen Curry',
  'steph': 'Stephen Curry',
  'sga': 'Shai Gilgeous-Alexander',
  'shai': 'Shai Gilgeous-Alexander',
  'bron': 'LeBron James',
  'lebron': 'LeBron James',
  'kd': 'Kevin Durant',
  'ant': 'Anthony Edwards',
  'giannis': 'Giannis Antetokounmpo',
  'greek freak': 'Giannis Antetokounmpo',
  'luka': 'Luka Doncic',
  'doncic': 'Luka Doncic',
  'trae': 'Trae Young',
  'dame': 'Damian Lillard',
  'book': 'Devin Booker',
  'jaylen': 'Jaylen Brown',
  'jt': 'Jayson Tatum',
  'tatum': 'Jayson Tatum',
  'embiid': 'Joel Embiid',
  'ad': 'Anthony Davis',
  'cp3': 'Chris Paul',
  'pg': 'Paul George',
  'russ': 'Russell Westbrook',
  'harden': 'James Harden',
  'kawhi': 'Kawhi Leonard',
  'payton': 'Payton Prichard',
  'pritchard': 'Payton Prichard',
  'cam': 'Cam Thomas',
  'victor': 'Victor Wembanyama',
  'cade': 'Cade Cunningham',
  'scoot': 'Scoot Henderson',
  'evan': 'Evan Mobley',
  'mobley': 'Evan Mobley',
  'franz': 'Franz Wagner',
  'bam': 'Bam Adebayo',
  'tyrese': 'Tyrese Haliburton',
  'hali': 'Tyrese Haliburton',
  'herro': 'Tyler Herro',
  'klay': 'Klay Thompson',
  'draymond': 'Draymond Green',
  'jalen': 'Jalen Brunson',
  'brunson': 'Jalen Brunson',
  'donovan': 'Donovan Mitchell',
  'spida': 'Donovan Mitchell',
  'zion': 'Zion Williamson',
  'ja': 'Ja Morant',
  'morant': 'Ja Morant',
  'scottie': 'Scottie Barnes',
  'garland': 'Darius Garland',
  'lauri': 'Lauri Markkanen',
  'rudy': 'Rudy Gobert',
  'kat': 'Karl-Anthony Towns',
  'towns': 'Karl-Anthony Towns',
  'fox': "De'Aaron Fox",
  'spida': 'Donovan Mitchell',
  'sabonis': 'Domantas Sabonis',
  'siakam': 'Pascal Siakam',
  'wiggins': 'Andrew Wiggins',
  'poole': 'Jordan Poole',
};

const normalizeInput = (raw: string): string => {
  const lower = raw.trim().toLowerCase();
  return NICKNAMES[lower] || raw.trim();
};

// ─── Tier config — includes bench tiers ──────────────────────────────────────

const TIER_STYLES: Record<string, string> = {
  'Lock In':     'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  'Start':       'bg-purple-500/10 border-purple-500/20 text-purple-400',
  'Monitor':     'bg-amber-500/10 border-amber-500/20 text-amber-400',
  'Sit':         'bg-rose-500/10 border-rose-500/20 text-rose-400',
  'Top Reserve': 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  'Solid Bench': 'bg-slate-500/10 border-slate-500/20 text-slate-400',
  'Deep Cut':    'bg-slate-700/30 border-slate-700 text-slate-500',
  'Injured':     'bg-rose-500/10 border-rose-500/20 text-rose-400',
  'Suspended':   'bg-orange-500/10 border-orange-500/20 text-orange-400',
};

const TIER_RANK_STYLES: Record<string, string> = {
  'Lock In':     'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  'Start':       'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  'Monitor':     'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Sit':         'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  'Top Reserve': 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  'Solid Bench': 'bg-slate-600/20 text-slate-400 border border-slate-600/30',
  'Deep Cut':    'bg-slate-700/20 text-slate-500 border border-slate-700/30',
  'Injured':   'bg-rose-500/10 border-rose-500/20 text-rose-400',
  'Suspended': 'bg-orange-500/10 border-orange-500/20 text-orange-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TierBadge = ({ tier }: { tier: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wide ${TIER_STYLES[tier] || TIER_STYLES['Deep Cut']}`}>
    {tier}
  </span>
);

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
};

const ReasonPill = ({ reason }: { reason: string }) => {
  const isGood = reason.includes('🔥') || reason.includes('Trending Up') || reason.includes('Minutes Up') || reason.includes('Elite') || reason.includes('Strong') || reason.includes('Fresh Legs');
  const isBad = reason.includes('⚠️') || reason.includes('Trending Down') || reason.includes('Reduced Role') || reason.includes('Fatigue Risk');
  const base = 'text-xs px-2.5 py-1 rounded-lg border ';
  const style = isGood
    ? base + 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
    : isBad
    ? base + 'bg-rose-500/10 border-rose-500/20 text-rose-300'
    : base + 'bg-slate-800/80 border-slate-700/50 text-slate-400';
  return <span className={style}>{reason}</span>;
};

const PlayerTag = ({ tag, onRemove }: { tag: ResolvedTag; onRemove: () => void }) => {
  if (tag.status === 'resolving') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>{tag.input}</span>
      </div>
    );
  }
  if (tag.status === 'not_found') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
        <AlertTriangle className="w-3 h-3" />
        <span>{tag.input}</span>
        <button onClick={onRemove} className="ml-1 hover:text-rose-200 transition-colors"><X className="w-3 h-3" /></button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
      <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
        <img
          src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${tag.player?.id}.png`}
          className="w-full h-full object-cover"
          onError={(e) => (e.currentTarget.style.display = 'none')}
          referrerPolicy="no-referrer"
        />
      </div>
      <span className="font-medium">{tag.player?.first_name} {tag.player?.last_name}</span>
      <button onClick={onRemove} className="ml-1 hover:text-emerald-200 transition-colors"><X className="w-3 h-3" /></button>
    </div>
  );
};

const PlayerResultCard = ({ player, rank, defaultExpanded = false }: {
  player: OptimizedPlayer;
  rank: number;
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-5 flex items-center gap-4 hover:bg-slate-800/40 transition-colors"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${TIER_RANK_STYLES[player.tier] || TIER_RANK_STYLES['Deep Cut']}`}>
          {rank}
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
            alt={player.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-slate-100 font-bold truncate">{player.name}</span>
            {player.position && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex-shrink-0">
                {player.position}
              </span>
            )}
            <span className="text-xs text-slate-500 flex-shrink-0">{player.team}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TierBadge tier={player.tier} />
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <TrendIcon trend={player.minutes_trend} />
              <span>{player.minutes_avg.toFixed(0)} mpg</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 gap-1">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl border ${getScoreBg(player.dr_score)}`}>
            <span className={`text-xl font-bold ${getScoreColor(player.dr_score)}`}>
              {player.dr_score.toFixed(0)}
            </span>
          </div>
          <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">DR Score</span>
        </div>
        <div className="text-slate-500 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-800">
          <div className="grid grid-cols-5 gap-2 mt-4 mb-4">
            {[
              { label: 'PTS', val: player.stats.pts },
              { label: 'AST', val: player.stats.ast },
              { label: 'REB', val: player.stats.reb },
              { label: 'STL', val: player.stats.stl },
              { label: 'BLK', val: player.stats.blk },
            ].map(s => (
              <div key={s.label} className="bg-slate-950/50 rounded-lg p-2.5 border border-slate-800/50 text-center">
                <div className="text-xs text-slate-500 mb-0.5">{s.label}</div>
                <div className="text-sm font-bold text-slate-200">{s.val.toFixed(1)}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {player.reasons.map((r, i) => (
              <ReasonPill key={i} reason={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function OptimizeLineup({ onClose }: OptimizeLineupProps) {
  const [tags, setTags] = useState<ResolvedTag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [results, setResults] = useState<OptimizeLineupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullRosterExpanded, setFullRosterExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolveAndAdd = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const normalized = normalizeInput(trimmed);
    const alreadyExists = tags.some(t =>
      t.input.toLowerCase() === trimmed.toLowerCase() ||
      (t.player && `${t.player.first_name} ${t.player.last_name}`.toLowerCase() === normalized.toLowerCase())
    );
    if (alreadyExists) return;

    setTags(prev => [...prev, { input: trimmed, player: null, status: 'resolving' }]);

    try {
      const res = await searchPlayers(normalized);
      const match = res[0] ?? null;
      setTags(prev => prev.map(t =>
        t.input === trimmed && t.status === 'resolving'
          ? { ...t, player: match, status: match ? 'found' : 'not_found' }
          : t
      ));
    } catch {
      setTags(prev => prev.map(t =>
        t.input === trimmed && t.status === 'resolving'
          ? { ...t, status: 'not_found' }
          : t
      ));
    }
  }, [tags]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      resolveAndAdd(inputValue);
      setInputValue('');
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const handleOptimize = async () => {
    const foundTags = tags.filter(t => t.status === 'found' && t.player);
    if (foundTags.length < 2) return;
    setIsOptimizing(true);
    setError(null);
    try {
      const names = foundTags.map(t => `${t.player!.first_name} ${t.player!.last_name}`);
      const res = await optimizeLineup(names);
      if (!res) throw new Error('No response from server.');
      setResults(res);
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const foundCount = tags.filter(t => t.status === 'found').length;
  const notFoundCount = tags.filter(t => t.status === 'not_found').length;
  const resolvingCount = tags.filter(t => t.status === 'resolving').length;
  const starters = results?.players.filter(p => p.recommended_start) ?? [];
  const bench = results?.players.filter(p => !p.recommended_start) ?? [];

  return (
    <div className="w-full max-w-3xl mx-auto mb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Optimize Lineup</h2>
            <p className="text-sm text-slate-400">Type a player name and press Enter to add them</p>
          </div>
        </div>
        <button onClick={results
          ? () => { setResults(null); setError(null); setTags([]); setInputValue(''); setFullRosterExpanded(false); }
          : onClose
        }>
          {results
            ? <span className="text-sm font-medium text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">Start Over</span>
            : <X className="w-5 h-5 text-slate-500 hover:text-slate-300 transition-colors" />
          }
        </button>
      </div>

      {/* Step 1 — Input */}
      {!results && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-900/50">
          <div
            className="min-h-[120px] bg-slate-950/70 border border-slate-700 rounded-xl p-3 flex flex-wrap gap-2 cursor-text focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-500 transition-all"
            onClick={() => inputRef.current?.focus()}
          >
            {tags.map((tag, i) => (
              <PlayerTag key={i} tag={tag} onRemove={() => setTags(prev => prev.filter((_, idx) => idx !== i))} />
            ))}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={tags.length === 0 ? 'Type a name and press Enter — try "Wemby", "SGA", "Luka"...' : 'Add another player...'}
              className="flex-1 min-w-[220px] bg-transparent text-slate-100 placeholder-slate-600 text-sm outline-none py-1"
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs">
              {foundCount > 0 && <span className="flex items-center gap-1 text-emerald-400"><Check className="w-3 h-3" />{foundCount} found</span>}
              {resolvingCount > 0 && <span className="flex items-center gap-1 text-slate-400"><Loader2 className="w-3 h-3 animate-spin" />resolving...</span>}
              {notFoundCount > 0 && <span className="flex items-center gap-1 text-rose-400"><AlertTriangle className="w-3 h-3" />{notFoundCount} not found</span>}
              {tags.length === 0 && <span className="text-slate-600">Add 2–15 players from your fantasy roster</span>}
            </div>
            <span className="text-xs text-slate-600">Enter or comma to add</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm px-4 py-3 rounded-xl">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <button
            onClick={handleOptimize}
            disabled={foundCount < 2 || isOptimizing || resolvingCount > 0}
            className="mt-4 w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isOptimizing
              ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing your roster...</>
              : <><Zap className="w-4 h-4" />{foundCount >= 2 ? `Optimize ${foundCount} Players` : 'Add at least 2 players'}</>
            }
          </button>
        </div>
      )}

      {/* Step 2 — Results */}
      {results && (
        <div className="flex flex-col gap-6">
          {results.unresolved_names.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm px-4 py-3 rounded-xl">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Could not find: <span className="font-semibold">{results.unresolved_names.join(', ')}</span></span>
            </div>
          )}

          {/* Recommended Starters */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Recommended Starters</h3>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                Top {starters.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {starters.map((player, i) => (
                <PlayerResultCard key={player.id} player={player} rank={i + 1} defaultExpanded={true} />
              ))}
            </div>
          </div>

          {/* Full Roster */}
          {bench.length > 0 && (
            <div>
              <button
                onClick={() => setFullRosterExpanded(e => !e)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-3"
              >
                {fullRosterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Full Roster ({bench.length} remaining)
              </button>
              {fullRosterExpanded && (
                <div className="flex flex-col gap-2">
                  {bench.map((player, i) => (
                    <div key={player.id} className="opacity-60 hover:opacity-100 transition-opacity">
                      <PlayerResultCard player={player} rank={starters.length + i + 1} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {results.errored_players.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {results.errored_players.map((p, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  Could not load: {p.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}