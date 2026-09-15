/**
 * MenuOverlay.tsx - Tactical Fighter Pilot Mission Briefing & Main Menu
 * Introduces gestures, controls, and high score records.
 */

import React from 'react';
import { Play, Sliders, Volume2, VolumeX, Shield, Crosshair, Zap, Award } from 'lucide-react';

interface MenuOverlayProps {
  onStartGame: () => void;
  onStartCalibration: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  highScore: number;
}

export const MenuOverlay: React.FC<MenuOverlayProps> = ({
  onStartGame,
  onStartCalibration,
  isMuted,
  onToggleMute,
  highScore,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none font-mono">
      <div className="relative w-full max-w-2xl p-6 sm:p-10 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col items-center text-center">
        {/* Top classified badge */}
        <div className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-[11px] font-bold tracking-widest text-zinc-300 mb-4">
          ADVANCED DRONE COMBAT SIMULATOR // DREADNOUGHT ENCOUNTER
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-wider mb-2">
          AERO-STRIKE 3D
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-md mb-6 leading-relaxed">
          Real-Time Optical Hand-Tracking &amp; Autonomous Quadcopter Combat Simulation
        </p>

        {/* High Score Banner */}
        {highScore > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wider mb-6">
            <Award className="w-4 h-4 text-amber-400" />
            RECORD SCORE: {highScore.toLocaleString()} PTS
          </div>
        )}

        {/* Gesture Flight Controls Matrix (0 to 5 fingers) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-xl mb-8 text-left">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-black text-white">0</span>
            <div>
              <div className="text-xs font-bold text-zinc-200">HOVER / EVADE</div>
              <div className="text-[10px] text-zinc-400">Stationary Hover Mode</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-black text-white">1</span>
            <div>
              <div className="text-xs font-bold text-sky-400">SINGLE BULLET</div>
              <div className="text-[10px] text-zinc-400">Centerline Sniper Pulse</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-black text-white">2</span>
            <div>
              <div className="text-xs font-bold text-emerald-400">RAPID STREAM</div>
              <div className="text-[10px] text-zinc-400">Continuous Twin Cannons</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-black text-white">3</span>
            <div>
              <div className="text-xs font-bold text-cyan-400">PLASMA SPHERE</div>
              <div className="text-[10px] text-zinc-400">AOE Energy Blast</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-black text-white">4</span>
            <div>
              <div className="text-xs font-bold text-amber-400">ESCORT DRONES</div>
              <div className="text-[10px] text-zinc-400">Summon Twin Wingmen</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-black text-white">5</span>
            <div>
              <div className="text-xs font-bold text-rose-400">LASER BEAM</div>
              <div className="text-[10px] text-zinc-400">Continuous Piercing Beam</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            onClick={onStartGame}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black tracking-wider text-base shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            ENGAGE MISSION
          </button>

          <button
            onClick={onStartCalibration}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 font-bold tracking-wider text-sm transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            CALIBRATE HAND
          </button>

          <button
            onClick={onToggleMute}
            className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>
        </div>
      </div>
    </div>
  );
};
