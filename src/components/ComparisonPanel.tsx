import React from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { ComparisonPlayer, TrajectoryResponse, getScoreColor, getScoreBg } from '../types';
import { abbreviatePosition } from './PlayerCard';

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
}

export default function ComparisonPanel({ comparisonPlayers, onAddThird, onEndComparison }: ComparisonPanelProps) {
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
    </div>
  );
}
