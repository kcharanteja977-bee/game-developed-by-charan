/**
 * HUD.tsx - High-Contrast Drone Flight Combat HUD
 * Matches the reference aesthetic:
 * - Top Dreadnought Class Boss Bar: "NEXUS SWARM QUEEN" with crimson segmented HP
 * - Clean Daylight Telemetry Badges: AIRSPEED (5 KM/H), ALTITUDE (2.4 M), VSI, BATTERY, THRUST
 * - Left Tactical Mode Selector (0 to 5 fingers)
 * - 3D Target Lock Reticles
 * - Clean minimal controls
 */

import React from 'react';
import { Volume2, VolumeX, Shield, AlertTriangle } from 'lucide-react';
import { FlightTelemetry, HandState } from '../types';

interface HUDProps {
  telemetry: FlightTelemetry;
  handState: HandState;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onCalibrate: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  handState,
  isMuted,
  onToggleMute,
  onPause,
  onCalibrate,
}) => {
  const bossHpPercent = telemetry.maxBossHp > 0
    ? Math.max(0, Math.min(100, Math.round((telemetry.bossHp / telemetry.maxBossHp) * 100)))
    : 100;

  // Tactical modes corresponding to 0-5 fingers
  const tacticalModes = [
    { num: 0, label: 'HOVER / EVADE', gesture: 'FIST' },
    { num: 1, label: 'SINGLE BULLET', gesture: 'ONE_FINGER' },
    { num: 2, label: 'RAPID STREAM', gesture: 'TWO_FINGERS' },
    { num: 3, label: 'PLASMA SPHERE', gesture: 'THREE_FINGERS' },
    { num: 4, label: 'ESCORT DRONES', gesture: 'FOUR_FINGERS' },
    { num: 5, label: 'LASER BEAM', gesture: 'OPEN_PALM' },
  ];

  const currentFingers = handState.detected ? handState.fingerCount : -1;

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-mono text-zinc-900">
      {/* 1. TOP CENTER: DREADNOUGHT CLASS BOSS BAR (Directly from reference photo) */}
      {telemetry.bossActive && (
        <div className="absolute top-3 inset-x-0 flex flex-col items-center pointer-events-auto px-4">
          <div className="w-full max-w-xl flex flex-col items-center bg-white/85 backdrop-blur-md border border-zinc-200/90 rounded-xl px-5 py-2.5 shadow-sm">
            {/* Header tag */}
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-zinc-600 uppercase">
              <span className="text-rose-600">▲</span>
              <span>{telemetry.bossClass || 'DREADNOUGHT CLASS ENEMY'}</span>
            </div>

            {/* Boss Name */}
            <div className="text-base sm:text-lg font-black tracking-wider text-zinc-900 mt-0.5">
              {telemetry.bossName || 'NEXUS SWARM QUEEN'}
            </div>

            {/* Segmented Crimson Health Bar */}
            <div className="w-full flex items-center gap-3 mt-1.5">
              <div className="relative flex-1 h-3.5 bg-zinc-200/90 rounded-sm overflow-hidden border border-zinc-300 p-[1px]">
                {/* Segmented grid overlay for high-tech look */}
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 rounded-xs transition-all duration-150"
                  style={{ width: `${bossHpPercent}%` }}
                />
                <div className="absolute inset-0 flex justify-between pointer-events-none px-1">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-[1px] h-full bg-white/40" />
                  ))}
                </div>
              </div>
              <span className="text-xs font-black text-rose-600 min-w-[36px] text-right">
                {bossHpPercent}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. TOP LEFT & RIGHT FLIGHT TELEMETRY (AIRSPEED, ALTITUDE, VSI, BATTERY, THRUST) */}
      <div className="absolute top-3 left-4 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-zinc-200/90 rounded-lg px-3 py-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-500 tracking-wider">AIRSPEED</span>
          <span className="text-xs font-black text-zinc-900">
            {telemetry.airspeedKmh ?? 5} KM/H
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-zinc-200/90 rounded-lg px-3 py-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-500 tracking-wider">ALTITUDE</span>
          <span className="text-xs font-black text-zinc-900">
            {(telemetry.altitudeM ?? 2.4).toFixed(1)} M
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-zinc-200/90 rounded-lg px-3 py-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-500 tracking-wider">VSI</span>
          <span className="text-xs font-black text-zinc-900">
            {(telemetry.vsiMs ?? 0.0).toFixed(1)} M/S
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-4 flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-zinc-200/90 rounded-lg px-3 py-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-500 tracking-wider">BATTERY</span>
          <span className="text-xs font-black text-emerald-600">
            {telemetry.batteryPercent ?? 74}%
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-zinc-200/90 rounded-lg px-3 py-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-500 tracking-wider">THRUST</span>
          <span className="text-xs font-black text-sky-600">
            {telemetry.thrustPercent ?? 45}%
          </span>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5 mt-1">
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-white/90 border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:border-zinc-400 transition-colors shadow-xs"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onCalibrate}
            className="px-2 py-1 rounded-lg bg-white/90 border border-zinc-200 text-[11px] font-bold text-zinc-700 hover:text-zinc-900 hover:border-zinc-400 transition-colors shadow-xs"
          >
            CALIBRATE
          </button>
          <button
            onClick={onPause}
            className="px-2 py-1 rounded-lg bg-white/90 border border-zinc-200 text-[11px] font-bold text-zinc-700 hover:text-zinc-900 hover:border-zinc-400 transition-colors shadow-xs"
          >
            PAUSE
          </button>
        </div>
      </div>

      {/* 3. LEFT COLUMN: TACTICAL MODE CHIPS (0 to 5 fingers matching photo) */}
      <div className="absolute left-4 top-40 flex flex-col gap-1.5 pointer-events-auto">
        <div className="text-[10px] font-bold text-zinc-500 tracking-widest pl-1">
          TACTICAL GESTURES
        </div>
        {tacticalModes.map((mode) => {
          const isActive = currentFingers === mode.num;
          return (
            <div
              key={mode.num}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                isActive
                  ? 'bg-zinc-900 text-white scale-105 border border-zinc-900'
                  : 'bg-white/80 backdrop-blur-md text-zinc-700 border border-zinc-200/80 hover:bg-white'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive ? 'bg-white text-zinc-900' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {mode.num}
              </span>
              <span className="tracking-wide">{mode.label}</span>
            </div>
          );
        })}
      </div>

      {/* 4. 3D PROJECTED TARGET LOCK-ON RETICLES */}
      {telemetry.targetLocks.map((lock) => (
        <div
          key={lock.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
          style={{ left: `${lock.screenX}px`, top: `${lock.screenY}px` }}
        >
          <div
            className={`relative flex items-center justify-center w-11 h-11 rounded-xs border-2 ${
              lock.locked
                ? 'border-rose-600 bg-rose-500/10 shadow-[0_0_10px_rgba(225,29,72,0.5)] animate-pulse'
                : 'border-zinc-600/80'
            }`}
          >
            <div className="absolute -top-1 -left-1 w-1.5 h-1.5 border-t-2 border-l-2 border-inherit" />
            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 border-t-2 border-r-2 border-inherit" />
            <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 border-b-2 border-l-2 border-inherit" />
            <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b-2 border-r-2 border-inherit" />
          </div>

          <div className="mt-1 text-center text-[9px] font-black tracking-wider text-zinc-900 bg-white/80 rounded px-1 backdrop-blur-xs shadow-xs">
            {lock.dist}M [{lock.type}]
          </div>
        </div>
      ))}

      {/* 5. BOTTOM BAR: HEALTH / SHIELD & HAND TRACKING STATUS */}
      <div className="absolute inset-x-0 bottom-0 px-6 py-3 flex items-end justify-between bg-gradient-to-t from-white/70 to-transparent">
        {/* Left: Hand Detection status */}
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/90 border border-zinc-200/90 shadow-xs backdrop-blur-md">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              handState.detected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
            }`}
          />
          <div className="flex flex-col text-xs">
            <span className="text-[10px] font-bold text-zinc-500">
              {handState.detected ? 'OPTICAL TRACKING LOCKED' : 'SEARCHING HAND...'}
            </span>
            <span className="font-bold text-zinc-900">
              {handState.detected
                ? `${handState.fingerCount} FINGER${handState.fingerCount === 1 ? '' : 'S'} • ${handState.action}`
                : 'HOLD HAND IN CAMERA VIEW'}
            </span>
          </div>
        </div>

        {/* Center: Drone Hull & Shield Deflector */}
        <div className="flex items-center gap-6 bg-white/90 border border-zinc-200/90 px-4 py-2 rounded-lg shadow-xs backdrop-blur-md">
          <div className="flex flex-col gap-1 w-28 sm:w-36">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-emerald-700">HULL</span>
              <span>{telemetry.health}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-150"
                style={{ width: `${Math.max(0, telemetry.health)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-28 sm:w-36">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-sky-700">DEFLECTOR</span>
              <span>{telemetry.shieldEnergy}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-150"
                style={{ width: `${telemetry.shieldEnergy}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Score & Wave */}
        <div className="flex items-center gap-4 bg-white/90 border border-zinc-200/90 px-3.5 py-1.5 rounded-lg shadow-xs backdrop-blur-md">
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-bold text-zinc-500 tracking-wider">SCORE</span>
            <span className="text-base font-black text-zinc-900">
              {telemetry.score.toLocaleString()}
            </span>
          </div>
          <div className="border-l border-zinc-300 pl-3 flex flex-col text-right">
            <span className="text-[9px] font-bold text-zinc-500 tracking-wider">WAVE</span>
            <span className="text-base font-black text-zinc-900">{telemetry.wave}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

