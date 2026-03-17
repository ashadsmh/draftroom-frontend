import React from 'react';
import { TrendingUp, TrendingDown, Minus, Star, ChevronRight, Bookmark } from 'lucide-react';
import { Player, getScoreColor, getScoreBg, getCareerTier } from '../types';

export const abbreviatePosition = (position: string): string => {
  if (!position) return '';
  if (position.length <= 2) return position;
  const map: Record<string, string> = {
    "Guard": "G",
    "Forward": "F",
    "Center": "C",
    "Point Guard": "PG",
    "Shooting Guard": "SG",
    "Small Forward": "SF",
    "Power Forward": "PF",
    "Forward-Guard": "F-G",
    "Guard-Forward": "G-F",
    "Forward-Center": "F-C",
    "Center-Forward": "C-F"
  };
  return map[position] || position;
};

const TrendIcon = ({ trend }: { trend: Player['trend'] }) => {
  if (!trend) return null;
  if (trend === 'up') return <TrendingUp className="w-5 h-5 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-5 h-5 text-rose-400" />;
  if (trend === 'stable') return <Minus className="w-5 h-5 text-slate-400" />;
  return null;
};

const PlayerCard = ({ player, isBreakout = false, onSelect, isBookmarked = false, onToggleBookmark, showBookmark = false }: { player: Player; isBreakout?: boolean; onSelect?: (player: Player) => void; isBookmarked?: boolean; onToggleBookmark?: (player: Player) => void; showBookmark?: boolean; key?: React.Key }) => {  return (
    <div className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
      isBreakout 
        ? 'bg-slate-900 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)] hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.1)]' 
        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-900/50'
    }`}>
      {isBreakout && (
        <div className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <Star className="w-3 h-3 fill-slate-950" />
          BREAKOUT
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <img 
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
              alt={player.name}
              className="w-12 h-12 rounded-lg object-cover bg-slate-800/50"
              onError={(e) => e.currentTarget.style.display = 'none'}
              referrerPolicy="no-referrer"
            />
            {(() => {
              const tier = getCareerTier(parseInt(player.id));
              if (tier === 'Elite') return (
                <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[7px] font-black px-1 py-0.5 rounded-full leading-none shadow-sm tracking-tight">
                  ELITE
                </div>
              );
              if (tier === 'Star') return (
                <div className="absolute -top-1.5 -right-1.5 bg-slate-900 border border-yellow-500/50 rounded-full p-0.5 shadow-md">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#eab308" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              );
              return null;
            })()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-100 truncate">{player.name}</h3>
              <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {abbreviatePosition(player.position)}
              </span>
            </div>
            <p className="text-sm text-slate-400 truncate">{player.team}</p>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 ml-2">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl border ${player.score ? getScoreBg(player.score) : 'bg-slate-800/50 border-slate-700'}`}>
            <span className={`text-xl font-bold ${player.score ? getScoreColor(player.score) : 'text-slate-500'}`}>{player.score ? player.score : '—'}</span>
          </div>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">DR Score</span>
        </div>
      </div>

      {player.stats ? (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
            <div className="text-xs text-slate-500 mb-1">PTS</div>
            <div className="text-lg font-semibold text-slate-200">{player.stats.pts.toFixed(1)}</div>
          </div>
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
            <div className="text-xs text-slate-500 mb-1">AST</div>
            <div className="text-lg font-semibold text-slate-200">{player.stats.ast.toFixed(1)}</div>
          </div>
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
            <div className="text-xs text-slate-500 mb-1">REB</div>
            <div className="text-lg font-semibold text-slate-200">{player.stats.reb.toFixed(1)}</div>
          </div>
        </div>
      ) : (
        <div className="mb-5">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="bg-slate-950/30 rounded-lg p-3 border border-slate-800/30">
              <div className="text-xs text-slate-600 mb-1">PTS</div>
              <div className="text-lg font-semibold text-slate-600">—</div>
            </div>
            <div className="bg-slate-950/30 rounded-lg p-3 border border-slate-800/30">
              <div className="text-xs text-slate-600 mb-1">AST</div>
              <div className="text-lg font-semibold text-slate-600">—</div>
            </div>
            <div className="bg-slate-950/30 rounded-lg p-3 border border-slate-800/30">
              <div className="text-xs text-slate-600 mb-1">REB</div>
              <div className="text-lg font-semibold text-slate-600">—</div>
            </div>
          </div>
          <div className="text-center text-xs text-slate-500">Click Load Analysis to reveal</div>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {player.trend && (
            <>
              <TrendIcon trend={player.trend} />
              <span className="text-sm font-medium text-slate-400">
                {player.trend === 'up' ? 'Trending Up' : player.trend === 'down' ? 'Trending Down' : 'Holding Steady'}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showBookmark && onToggleBookmark && (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleBookmark(player); }}
              className={`transition-colors p-1.5 rounded-lg ${isBookmarked ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
            </button>
          )}
          <button 
            onClick={() => onSelect && onSelect(player)}
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-sm font-medium"
          >
            Load Analysis <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
