import React, { useState } from 'react';
import { TrendingUp, Zap, BarChart2, ArrowRight, Shield, Clock } from 'lucide-react';

interface LandingPageProps {
  onEnterApp: (mode?: 'optimize') => void;
}

const MOCK_PLAYERS = [
  {
    name: 'Shai Gilgeous-Alexander',
    team: 'OKC',
    position: 'PG',
    id: 1628983,
    score: 94.2,
    tier: 'Elite',
    components: { ts: 88, playmaking: 91, defense: 72, foulDraw: 85, volume: 90 },
    stats: { pts: 32.4, ast: 6.2, reb: 5.1 },
  },
  {
    name: 'Victor Wembanyama',
    team: 'SAS',
    position: 'C',
    id: 1641705,
    score: 91.7,
    tier: 'Elite',
    components: { ts: 82, playmaking: 68, defense: 97, foulDraw: 79, volume: 88 },
    stats: { pts: 24.1, ast: 3.8, reb: 10.6 },
  },
  {
    name: 'Nikola Jokic',
    team: 'DEN',
    position: 'C',
    id: 203999,
    score: 97.1,
    tier: 'Elite',
    components: { ts: 95, playmaking: 98, defense: 74, foulDraw: 80, volume: 92 },
    stats: { pts: 29.6, ast: 10.2, reb: 12.7 },
  },
];

function RadarBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-20 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-6">{value}</span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-rose-400';
  const ring = score >= 85 ? 'border-emerald-500/40' : score >= 70 ? 'border-amber-500/40' : 'border-rose-500/40';
  const bg = score >= 85 ? 'bg-emerald-500/10' : score >= 70 ? 'bg-amber-500/10' : 'bg-rose-500/10';
  return (
    <div className={`w-16 h-16 rounded-xl border-2 ${ring} ${bg} flex items-center justify-center`}>
      <span className={`text-2xl font-extrabold ${color}`}>{score}</span>
    </div>
  );
}

export default function LandingPage({ onEnterApp }: LandingPageProps) {
  const [activePlayer, setActivePlayer] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const player = MOCK_PLAYERS[activePlayer];

  const handleEnter = (mode?: 'optimize') => {
    setIsExiting(true);
    setTimeout(() => onEnterApp(mode), 400);
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 flex flex-col transition-opacity duration-400 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-purple-500" strokeWidth={2.5} />
          <span className="text-lg font-extrabold tracking-tight text-white">DraftRoom</span>
        </div>
        <button
          onClick={() => handleEnter()}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Skip intro →
        </button>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-6 py-12 max-w-7xl mx-auto w-full">

        {/* Left — copy */}
        <div className="flex-1 flex flex-col items-start max-w-xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1 mb-6">
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Fantasy Basketball Analytics</span>
          </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-100 leading-tight mb-4 tracking-tight">
            Stop guessing.<br />
            <span className="text-purple-400">Start winning.</span>
        </h1>

        <p className="text-lg text-slate-400 mb-6 leading-relaxed">
            DraftRoom brings together proprietary efficiency scores, real-time injury intelligence, and opponent-adjusted projections.
        </p>

          {/* Three reason boxes */}
          <div className="flex flex-col gap-3 mb-8 w-full">
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
              <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20 flex-shrink-0">
                <BarChart2 className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Proprietary DR Score</div>
                <div className="text-xs text-slate-500">Efficiency metric built from TS%, playmaking, defense, foul draw & volume</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex-shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Injury-Aware Lineup Decisions</div>
                <div className="text-xs text-slate-500">Real-time injury reports with reasoned start/sit recommendations</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
              <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20 flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Opponent-Adjusted Projections</div>
                <div className="text-xs text-slate-500">5-game stat forecasts calibrated against upcoming defensive matchups</div>
              </div>
            </div>
          </div>

          {/* CTAs — Explore Players first */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleEnter()}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-purple-900/30"
            >
              Explore Players
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEnter('optimize')}
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold px-6 py-3 rounded-xl border border-slate-700 transition-colors"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              Optimize My Lineup
            </button>
          </div>
        </div>

        {/* Right — product preview */}
        <div className="flex-1 flex flex-col items-center max-w-md w-full">

          {/* Player selector tabs */}
          <div className="flex gap-2 mb-4 w-full">
            {MOCK_PLAYERS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActivePlayer(i)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors truncate px-2 ${
                  i === activePlayer
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {p.name.split(' ').pop()}
              </button>
            ))}
          </div>

          {/* DR Score card */}
          <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl shadow-slate-900/50">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                  alt={player.name}
                  className="w-20 h-20 rounded-xl object-cover bg-slate-800"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="text-sm font-bold text-slate-100">{player.name}</div>
                  <div className="text-xs text-slate-500">{player.team} · {player.position}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ScoreRing score={player.score} />
                <span className="text-xs text-slate-500">DR Score</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'PPG', value: player.stats.pts },
                { label: 'APG', value: player.stats.ast },
                { label: 'RPG', value: player.stats.reb },
              ].map(stat => (
                <div key={stat.label} className="bg-slate-950/50 rounded-xl p-3 text-center border border-slate-800/50">
                  <div className="text-lg font-bold text-slate-100">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Component bars */}
            <div className="flex flex-col gap-2.5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Score Breakdown</div>
              <RadarBar label="Efficiency" value={player.components.ts} color="bg-purple-500" />
              <RadarBar label="Playmaking" value={player.components.playmaking} color="bg-indigo-500" />
              <RadarBar label="Defense" value={player.components.defense} color="bg-emerald-500" />
              <RadarBar label="Foul Draw" value={player.components.foulDraw} color="bg-amber-500" />
              <RadarBar label="Volume" value={player.components.volume} color="bg-rose-500" />
            </div>

            {/* Elite badge */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Season tier</span>
              <span className="px-2.5 py-1 bg-amber-500 text-slate-950 text-xs font-black rounded-full">ELITE</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-3 text-center">
            Live data from last 10 games · Updated daily
          </p>
        </div>
      </main>

      {/* Bottom bar */}
      <div className="border-t border-slate-800/50 px-6 py-4 flex items-center justify-center">
        <p className="text-xs text-slate-600">© 2026 DraftRoom · Free to use</p>
      </div>
    </div>
  );
}