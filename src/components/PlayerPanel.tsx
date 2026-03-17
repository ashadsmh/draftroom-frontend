import React from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus, Bookmark, X } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { abbreviatePosition } from './PlayerCard';
import { NbaPlayer, DraftRoomScoreResponse, TrajectoryResponse, getScoreColor, getScoreBg, getCareerTier } from '../types';

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
  onClose
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col shadow-xl shadow-slate-900/50">
      <div className="flex justify-between items-start w-full mb-6">
        <div></div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleBookmark}
            className={`transition-colors p-2 rounded-lg ${isBookmarked ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            title={isBookmarked ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <Bookmark className="w-5 h-5" fill={isBookmarked ? "currentColor" : "none"} />
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
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-4 mb-2">
            <div className="relative flex-shrink-0">
              <img 
                src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${selectedPlayer.id}.png`}
                alt={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
                className="w-20 h-20 rounded-xl object-cover border border-slate-700 bg-slate-800/50"
                onError={(e) => e.currentTarget.style.display = 'none'}
                referrerPolicy="no-referrer"
              />
              {(() => {
                const tier = getCareerTier(selectedPlayer.id);
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
    </div>
  );
};

export default PlayerPanel;
