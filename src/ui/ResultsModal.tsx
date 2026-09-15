/**
 * ResultsModal.tsx - Post-Mission Debriefing & Performance Evaluation
 * Calculates combat rank (S, A, B, C) and displays detailed sortie statistics.
 */

import React from 'react';
import { RotateCcw, Home, Award, Target, Flame, ShieldAlert } from 'lucide-react';
import { FlightTelemetry } from '../types';

interface ResultsModalProps {
  telemetry: FlightTelemetry;
  onRetry: () => void;
  onMainMenu: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  telemetry,
  onRetry,
  onMainMenu,
}) => {
  // Compute Combat Rank
  let rank = 'C';
  let rankColor = 'text-slate-400';
  if (telemetry.score >= 15000) {
    rank = 'S';
    rankColor = 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]';
  } else if (telemetry.score >= 8000) {
    rank = 'A';
    rankColor = 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]';
  } else if (telemetry.score >= 3500) {
    rank = 'B';
    rankColor = 'text-emerald-400';
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-mono">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col items-center text-center">
        {/* Top Status */}
        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold tracking-widest mb-2">
          <ShieldAlert className="w-4 h-4" />
          AIRCRAFT DOWN // MISSION CONCLUDED
        </div>

        {/* Combat Rank Badge */}
        <div className="relative my-3 flex flex-col items-center">
          <div className="text-[10px] text-slate-400 tracking-widest">COMBAT PERFORMANCE RANK</div>
          <div className={`text-6xl sm:text-7xl font-black ${rankColor} tracking-tighter`}>
            {rank}
          </div>
        </div>

        {/* Final Score */}
        <div className="mb-6">
          <div className="text-xs text-slate-400 tracking-wider">FINAL SCORE</div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-wider">
            {telemetry.score.toLocaleString()} <span className="text-sm text-cyan-400">PTS</span>
          </div>
        </div>

        {/* Tactical Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8">
          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <Target className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-base font-bold text-white">{telemetry.enemiesDestroyed}</span>
            <span className="text-[10px] text-slate-400">ENEMIES DOWN</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <Award className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-base font-bold text-white">{telemetry.wave}</span>
            <span className="text-[10px] text-slate-400">WAVES SURVIVED</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <Flame className="w-4 h-4 text-orange-400 mb-1" />
            <span className="text-base font-bold text-white">{telemetry.combo}</span>
            <span className="text-[10px] text-slate-400">MAX COMBO</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            onClick={onRetry}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black tracking-wider text-sm shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            RETRY SORTIE
          </button>

          <button
            onClick={onMainMenu}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold tracking-wider text-sm transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            MENU
          </button>
        </div>
      </div>
    </div>
  );
};
