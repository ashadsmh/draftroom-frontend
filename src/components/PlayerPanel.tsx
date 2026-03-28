import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus, Bookmark, X } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { abbreviatePosition } from './PlayerCard';
import { getScoreColor, getScoreBg, getCareerTier } from '../types';
import { NbaPlayer, DraftRoomScoreResponse, TrajectoryResponse, getDraftRoomHistory, DrHistoryEntry } from '../api/nba';

// ─── DR Score tooltip ─────────────────────────────────────────────────────────

const DR_COMPONENTS = [
  { label: 'True Shooting',     weight: '25%', color: 'bg-purple-500'  },
  { label: 'Volume Efficiency', weight: '25%', color: 'bg-rose-500'    },
  { label: 'Defensive Impact',  weight: '25%', color: 'bg-emerald-500' },
  { label: 'Playmaking',        weight: '20%', color: 'bg-indigo-500'  },
  { label: 'Foul Drawing',      weight: '5%',  color: 'bg-amber-500'   },
];

function DrScoreTooltip() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-4 h-4 rounded-full border border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400 transition-colors flex items-center justify-center text-[10px] font-bold"
      >
        ?
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 text-left">
          <div className="text-xs font-bold text-slate-200 mb-2">How DR Score works</div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            A 0–100 fantasy value metric calculated from your last 10 games. Rewards players who contribute across multiple dimensions — not just solely scoring.
          </p>
          <div className="flex flex-col gap-1.5">
            {DR_COMPONENTS.map(c => (
              <div key={c.label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.color}`} />
                  <span className="text-xs text-slate-400">{c.label}</span>
                </div>
                <span className="text-xs font-bold text-slate-500">{c.weight}</span>
              </div>
            ))}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PlayerPanelProps {
  selectedPlayer: NbaPlayer;
  selectedPlayerStats: any;
  isLoadingStats: boolean;
  selectedPlayerDraftScore: DraftRoomScoreResponse | null;
  isLoadingDraftScore: boolean;
  selectedPlayerTrajectory: TrajectoryResponse | null;
  isLoadingTrajectory: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onStartComparison: () => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  selectedPlayer,
  selectedPlayerStats,
  isLoadingStats,
  selectedPlayerDraftScore,
  isLoadingDraftScore,
  selectedPlayerTrajectory,
  isLoadingTrajectory,
  isBookmarked,
  onToggleBookmark,
  onStartComparison,
  onClose,
}) => {
  const [drHistory, setDrHistory]         = useState<DrHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError]   = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<'10' | '20' | '40' | 'season'>('20');

  useEffect(() => {
    if (!selectedPlayer) return;
    let cancelled = false;
    setIsLoadingHistory(true);
    setHistoryError(null);
    setDrHistory([]);

    getDraftRoomHistory(selectedPlayer.id, selectedRange)
      .then(data => {
        if (cancelled) return;
        if (!data || data.length === 0) setHistoryError('History unavailable');
        else setDrHistory(data);
      })
      .catch(() => { if (!cancelled) setHistoryError('History unavailable'); })
      .finally(() => { if (!cancelled) setIsLoadingHistory(false); });

    return () => { cancelled = true; };
  }, [selectedPlayer, selectedRange]);

  const sortedHistory = [...drHistory].sort((a, b) => a.game_number - b.game_number);

  // Career tier badge
  const tier = getCareerTier(selectedPlayer.id);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col shadow-xl shadow-slate-900/50">
      {/* Header row */}
      <div className="flex justify-end w-full mb-6 gap-2">
        <button
          onClick={onToggleBookmark}
          className={`transition-colors p-2 rounded-lg ${isBookmarked ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
          title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          <Bookmark className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={onStartComparison}
          disabled={isLoadingStats || isLoadingDraftScore || isLoadingTrajectory}
          className="text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 text-sm font-medium border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Compare
        </button>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
        {/* ─── Left column ─────────────────────────────────────────────── */}
        <div className="flex-1 w-full">
          {/* Player identity */}
          <div className="flex items-center gap-4 mb-2">
            <div className="relative flex-shrink-0">
              <img
                src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${selectedPlayer.id}.png`}
                alt={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
                className="w-20 h-20 rounded-xl object-cover border border-slate-700 bg-slate-800/50"
                onError={(e) => (e.currentTarget.style.display = 'none')}
                referrerPolicy="no-referrer"
              />
              {tier === 'Elite' && (
                <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[7px] font-black px-1 py-0.5 rounded-full leading-none shadow-sm tracking-tight">
                  ELITE
                </div>
              )}
              {tier === 'Star' && (
                <div className="absolute -top-1 -right-1 bg-slate-900 border border-yellow-500/50 rounded-full p-0.5 shadow-sm">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#eab308" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              )}
            </div>
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
              <p className="text-lg text-slate-400">{selectedPlayer.team.full_name}</p>
            </div>
          </div>

          {/* Season form */}
          {isLoadingStats ? (
            <LoadingRow label="Loading Season Form — Last 10 Games..." />
          ) : selectedPlayerStats ? (
            <div>
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Season Form — Last {selectedPlayerStats.count} {selectedPlayerStats.count === 1 ? 'Game' : 'Games'}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'PTS', value: selectedPlayerStats.pts },
                  { label: 'AST', value: selectedPlayerStats.ast },
                  { label: 'REB', value: selectedPlayerStats.reb },
                  { label: 'FG%', value: (selectedPlayerStats.fg_pct || 0) * 100, suffix: '%' },
                  { label: 'STL', value: selectedPlayerStats.stl },
                  { label: 'BLK', value: selectedPlayerStats.blk },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
                    <div className="text-sm text-slate-500 mb-1 font-medium">{stat.label}</div>
                    <div className="text-3xl font-bold text-slate-200">
                      {stat.value?.toFixed(1) || '0.0'}{stat.suffix || ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState text="No Season Form — Last 10 Games available." />
          )}

          {/* DR Score history chart */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">DR Score History</div>
              <div className="flex gap-1">
                {(['10', '20', '40', 'season'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setSelectedRange(range)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                      selectedRange === range
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {range === 'season' ? 'Season' : `L${range}`}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingHistory ? (
              <LoadingRow label="Loading DR Score history..." />
            ) : historyError ? (
              <EmptyState text={historyError} />
            ) : sortedHistory.length > 0 ? (
              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={sortedHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="game_number"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Game', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 10 }}
                    />
                    <YAxis
                      domain={([dataMin, dataMax]: [number, number]) => {
                        const padding = Math.max((dataMax - dataMin) * 0.2, 5);
                        return [Math.max(40, Math.floor(dataMin - padding)), Math.min(100, Math.ceil(dataMax + padding))];
                      }}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: '#334155', strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
                            <div className="text-xs text-slate-400 mb-1">vs {d.opponent} · {d.date}</div>
                            <div className="text-sm font-black text-purple-400">DR Score: {d.dr_score}</div>
                            <div className="text-xs text-slate-500 mt-1">{d.pts} PTS · {d.ast} AST · {d.reb} REB</div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={70} stroke="#334155" strokeDasharray="4 4" />
                    <ReferenceLine y={50} stroke="#334155" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="dr_score"
                      stroke="rgb(168,85,247)"
                      strokeWidth={2}
                      dot={{ fill: 'rgb(168,85,247)', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: 'rgb(168,85,247)', stroke: '#0f172a', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 justify-end">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-3 h-0.5 bg-slate-700 border-dashed" />
                    <span>70 Elite</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-3 h-0.5 bg-slate-700" />
                    <span>50 Average</span>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="No history available." />
            )}
          </div>

          {/* 5-Game Projection */}
          <div className="mt-8">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">5-Game Projection</div>
            {isLoadingTrajectory ? (
              <LoadingRow label="Computing Projections..." />
            ) : selectedPlayerTrajectory ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'PTS',      data: selectedPlayerTrajectory.PTS },
                  { label: 'AST',      data: selectedPlayerTrajectory.AST },
                  { label: 'REB',      data: selectedPlayerTrajectory.REB },
                  { label: 'DR Score', data: selectedPlayerTrajectory.DraftRoomScore },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
                      {stat.data.trend === 'up'     ? <TrendingUp   className="w-4 h-4 text-emerald-400" />
                       : stat.data.trend === 'down' ? <TrendingDown className="w-4 h-4 text-rose-400" />
                       : stat.data.trend === 'stable' ? <Minus       className="w-4 h-4 text-slate-400" />
                       : null}
                    </div>
                    <div className="text-2xl font-bold text-slate-200 mb-2">{stat.data.value.toFixed(1)}</div>
                    <div className="mt-auto flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            stat.data.confidence >= 70 ? 'bg-emerald-500'
                            : stat.data.confidence >= 50 ? 'bg-amber-500'
                            : 'bg-rose-500'
                          }`}
                          style={{ width: `${stat.data.confidence}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{stat.data.confidence.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Projection unavailable (needs 5+ games)." />
            )}
          </div>
        </div>

        {/* ─── Right column: DraftRoom Score ───────────────────────────── */}
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
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">DraftRoom Score</span>

              <DrScoreTooltip />

              <div className="w-[200px] h-[200px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { subject: 'Efficiency',  A: selectedPlayerDraftScore.components.ts_rel_score  },
                    { subject: 'Playmaking',  A: selectedPlayerDraftScore.components.play_score     },
                    { subject: 'Defense',     A: selectedPlayerDraftScore.components.def_score      },
                    { subject: 'Foul Draw',   A: selectedPlayerDraftScore.components.ftr_score      },
                    { subject: 'Volume',      A: selectedPlayerDraftScore.components.vol_eff_score  },
                  ]}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar dataKey="A" stroke="rgb(168,85,247)" strokeOpacity={0.8} fill="rgb(168,85,247)" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-3">
                {[
                  { label: 'TS Rel',     value: selectedPlayerDraftScore.components.ts_rel_score  },
                  { label: 'Playmaking', value: selectedPlayerDraftScore.components.play_score     },
                  { label: 'Def Impact', value: selectedPlayerDraftScore.components.def_score      },
                  { label: 'Foul Rate',  value: selectedPlayerDraftScore.components.ftr_score      },
                  { label: 'Vol Eff',    value: selectedPlayerDraftScore.components.vol_eff_score  },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-slate-200 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState text="Score unavailable (needs 5+ games)" className="py-8 text-center text-sm" />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Tiny shared helpers ──────────────────────────────────────────────────────

const LoadingRow = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 text-slate-400 py-4">
    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
    <span>{label}</span>
  </div>
);

const EmptyState = ({ text, className }: { text: string; className?: string }) => (
  <div className={`text-slate-500 italic py-4 bg-slate-950/30 rounded-xl px-4 border border-slate-800/30 ${className ?? ''}`}>
    {text}
  </div>
);

export default PlayerPanel;