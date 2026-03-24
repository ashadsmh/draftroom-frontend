import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { ComparisonPlayer, TrajectoryResponse, getScoreColor, getScoreBg, getCareerTier } from '../types';
import { abbreviatePosition } from './PlayerCard';
import { getDrHistory, DrHistoryEntry } from '../api/nba';

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

interface ComparisonPanelProps {
  comparisonPlayers: ComparisonPlayer[];
  onAddThird: () => void;
  onEndComparison: () => void;
  onRemovePlayer: (playerId: number) => void;
}

export default function ComparisonPanel({ comparisonPlayers, onAddThird, onEndComparison, onRemovePlayer }: ComparisonPanelProps) {
  const [selectedRange, setSelectedRange] = useState<'10' | '20' | '40' | 'season'>('20');
  const [historyMap, setHistoryMap] = useState<Record<number, DrHistoryEntry[]>>({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (comparisonPlayers.length < 2) return;
    const loadedIds = comparisonPlayers.filter(cp => !cp.isLoading).map(cp => cp.player.id);
    if (loadedIds.length < 2) return;
    setIsLoadingHistory(true);
    const fetchHistories = async () => {
      try {
        const results = await Promise.all(
          loadedIds.map(async id => {
            try {
              const data = await getDrHistory(id, selectedRange);
              return { id, data };
            } catch (err) {
              return { id, data: [] };
            }
          })
        );
        const map: Record<number, DrHistoryEntry[]> = {};
        results.forEach(r => { map[r.id] = r.data; });
        setHistoryMap(map);
      } catch (err) {
        console.error("Failed to fetch histories", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistories();
  }, [comparisonPlayers, selectedRange]);

  const mergedChartData = (() => {
    const players = comparisonPlayers.filter(cp => !cp.isLoading);
    if (players.length < 2) return [];
    const maxLen = Math.max(...players.map(cp => (historyMap[cp.player.id] || []).length));
    return Array.from({ length: maxLen }, (_, i) => {
      const point: any = { game_number: i + 1 };
      players.forEach(cp => {
        const hist = historyMap[cp.player.id] || [];
        if (hist[i]) {
          point[`dr_${cp.player.id}`] = hist[i].dr_score;
          point[`opp_${cp.player.id}`] = hist[i].opponent;
          point[`date_${cp.player.id}`] = hist[i].date;
        }
      });
      return point;
    });
  })();
  const lineColors = ['rgb(168,85,247)', 'rgb(52,211,153)', 'rgb(251,191,36)'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col shadow-xl shadow-slate-900/50">
      <div className="flex justify-between items-start w-full mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Player Comparison</h2>
        </div>
        <div className="flex items-center gap-2">
          {comparisonPlayers.length === 2 && (
            <button 
              onClick={onAddThird}
              className="text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 text-sm font-medium border border-slate-700"
            >
              Add Third Player
            </button>
          )}
          <button 
            onClick={onEndComparison}
            className="text-rose-400 hover:text-rose-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-400/10 text-sm font-medium border border-rose-400/20"
          >
            End Comparison
          </button>
        </div>
      </div>
      
      <div className="flex flex-col">
        <div className={`grid grid-cols-1 ${comparisonPlayers.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-8`}>
          {comparisonPlayers.map((cp, idx) => {
            const radarColor = idx === 0 ? 'rgb(168,85,247)' : idx === 1 ? 'rgb(52,211,153)' : 'rgb(251,191,36)';
            return (
              <div key={cp.player.id} className="flex flex-col relative">
                {comparisonPlayers.length > 1 && (
                  <button
                    onClick={() => onRemovePlayer(cp.player.id)}
                    className="absolute top-0 right-0 text-slate-500 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-400/10 z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {/* Header */}
                <div className="text-center mb-8 flex flex-col items-center">
                  <div className="relative inline-block mb-3">
                    <img 
                      src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${cp.player.id}.png`}
                      alt={`${cp.player.first_name} ${cp.player.last_name}`}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-800/50"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                      referrerPolicy="no-referrer"
                    />
                    {(() => {
                      const tier = getCareerTier(cp.player.id);
                      if (tier === 'Elite') return (
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[7px] font-black px-1 py-0.5 rounded-full leading-none shadow-sm tracking-tight">
                          ELITE
                        </div>
                      );
                      if (tier === 'Star') return (
                        <div className="absolute -top-1 -right-1 bg-slate-900 border border-yellow-500/50 rounded-full p-0.5 shadow-sm">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="#eab308" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                      );
                      return null;
                    })()}
                  </div>
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
        
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              DR Score History
            </div>
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
            <div className="flex items-center gap-3 text-slate-400 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              <span>Loading DR Score history...</span>
            </div>
          ) : mergedChartData.length > 0 ? (
            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                {comparisonPlayers.filter(cp => !cp.isLoading).map((cp, idx) => (
                  <div key={cp.player.id} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: lineColors[idx] }}></div>
                    <span className="text-xs text-slate-400">{cp.player.first_name} {cp.player.last_name}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={mergedChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="game_number"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Game', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: '#334155', strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
                            <div className="text-xs text-slate-500 mb-2">Game {d.game_number}</div>
                            {comparisonPlayers.filter(cp => !cp.isLoading).map((cp, idx) => {
                              const score = d[`dr_${cp.player.id}`];
                              const opp = d[`opp_${cp.player.id}`];
                              const date = d[`date_${cp.player.id}`];
                              if (score === undefined) return null;
                              return (
                                <div key={cp.player.id} className="flex items-center gap-2 mb-1 last:mb-0">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lineColors[idx] }}></div>
                                  <span className="text-xs text-slate-300">{cp.player.last_name}</span>
                                  {opp && <span className="text-xs text-slate-500">vs {opp}</span>}
                                  <span className="text-xs font-bold ml-auto" style={{ color: lineColors[idx] }}>{score}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={70} stroke="#334155" strokeDasharray="4 4" />
                  {comparisonPlayers.filter(cp => !cp.isLoading).map((cp, idx) => (
                    <Line
                      key={cp.player.id}
                      type="monotone"
                      dataKey={`dr_${cp.player.id}`}
                      stroke={lineColors[idx]}
                      strokeWidth={2}
                      dot={{ fill: lineColors[idx], r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: lineColors[idx], stroke: '#0f172a', strokeWidth: 2 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
