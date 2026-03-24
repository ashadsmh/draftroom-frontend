import React, { useState } from 'react';
import { X, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getScoreColor, getScoreBg } from '../types';
import { OptimizedPlayer, OptimizeLineupResponse, optimizeLineup } from '../api/nba';

interface OptimizeLineupProps {
  onClose: () => void;
}

export default function OptimizeLineup({ onClose }: OptimizeLineupProps) {
  const [rosterInput, setRosterInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeLineupResponse | null>(null);

  const handleOptimize = async () => {
    if (!rosterInput.trim()) {
      setError('Please paste your roster first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await optimizeLineup(rosterInput);
      if (response) {
        setResult(response);
      } else {
        setError('Failed to optimize lineup. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while optimizing the lineup.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const renderPlayerList = (players: OptimizedPlayer[], title: string) => (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-slate-100 mb-3">{title}</h3>
      <div className="space-y-3">
        {players.map((player, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-900/50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100">{player.name}</span>
                <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  {player.position}
                </span>
                <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  {player.team}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{player.reasoning}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${getScoreBg(player.score)} ${getScoreColor(player.score)}`}>
                  {player.score.toFixed(1)}
                  {renderTrendIcon(player.trend)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-slate-100">Optimize Lineup</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!result ? (
            <div className="space-y-4">
              <p className="text-slate-400">
                Paste your fantasy basketball roster below. We'll analyze matchups, injuries, and recent performance to recommend who to start and sit.
              </p>
              <textarea
                value={rosterInput}
                onChange={(e) => setRosterInput(e.target.value)}
                placeholder="e.g. LeBron James, Stephen Curry, Kevin Durant..."
                className="w-full h-48 bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
              />
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {renderPlayerList(result.start, "Recommended Starts")}
              {renderPlayerList(result.sit, "Recommended Sits")}
              
              <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                <button
                  onClick={() => setResult(null)}
                  className="text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  Optimize Another Roster
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
            <button
              onClick={handleOptimize}
              disabled={isLoading || !rosterInput.trim()}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Optimize'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
