/**
 * App.tsx - Hand Gesture Airplane Shooter
 * Provides live webcam-based gameplay in browser, real-time MediaPipe hand tracking,
 * and complete Python 3 (Pygame + OpenCV + MediaPipe) desktop project download & guide.
 */

import React, { useState, useRef } from 'react';
import { 
  Gamepad2, Code2, BookOpen, Plane, Download
} from 'lucide-react';
import { GameCanvas } from './components/GameCanvas';
import { PythonProjectHub } from './components/PythonProjectHub';
import { HandState, GestureType, ActionType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'game' | 'python' | 'guide'>('game');

  // Global hand state communicated from WebcamHandTracker to GameCanvas
  const [handState, setHandState] = useState<HandState>({
    detected: false,
    handX: 0.5,
    handY: 0.5,
    fingerCount: 0,
    gesture: 'NONE',
    action: 'HOLD FIRE',
  });

  // Zero-latency ref shared directly between MediaPipe worker and Three.js 60FPS flight loop
  const handStateRef = useRef<HandState>({
    detected: false,
    handX: 0.5,
    handY: 0.5,
    fingerCount: 0,
    gesture: 'NONE',
    action: 'HOLD FIRE',
  });

  // Manual gesture simulator buttons (for instant testing with or without webcam)
  const handleSimulateGesture = (action: 'HOVER' | 'SINGLE' | 'RAPID' | 'PLASMA' | 'ESCORT' | 'LASER') => {
    let gesture: GestureType = 'FIST';
    let actionType: ActionType = 'HOVER / MOVE';
    let fingerCount = 0;

    switch (action) {
      case 'SINGLE':
        gesture = 'ONE_FINGER';
        actionType = 'SINGLE BULLET';
        fingerCount = 1;
        break;
      case 'RAPID':
        gesture = 'TWO_FINGERS';
        actionType = 'RAPID STREAM';
        fingerCount = 2;
        break;
      case 'PLASMA':
        gesture = 'THREE_FINGERS';
        actionType = 'PLASMA SPHERE';
        fingerCount = 3;
        break;
      case 'ESCORT':
        gesture = 'FOUR_FINGERS';
        actionType = 'LASER BEAM'; // wingman escort
        fingerCount = 4;
        break;
      case 'LASER':
        gesture = 'OPEN_PALM';
        actionType = 'LASER BEAM';
        fingerCount = 5;
        break;
      case 'HOVER':
      default:
        gesture = 'FIST';
        actionType = 'HOVER / MOVE';
        fingerCount = 0;
        break;
    }

    const updatedState: HandState = {
      detected: true,
      handX: handStateRef.current.handX,
      handY: handStateRef.current.handY,
      fingerCount,
      gesture,
      action: actionType,
    };

    handStateRef.current = updatedState;
    setHandState(updatedState);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400 font-black text-sm">
                3D
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">
                  AERO-STRIKE 3D
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Drone Combat Sim
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Optical Hand-Tracking Tactical Quadcopter Simulation &amp; Dreadnought Encounter
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('game')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'game'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Simulation</span>
            </button>

            <button
              onClick={() => setActiveTab('python')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'python'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Python Source &amp; ZIP</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'guide'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Setup Guide</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'game' && (
          <div className="space-y-6">
            {/* Gesture Quick Reference Strip (0-5 Fingers matching reference) */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <button
                onClick={() => handleSimulateGesture('HOVER')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  handState.fingerCount === 0 && handState.detected
                    ? 'bg-zinc-800 border-zinc-500'
                    : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white bg-zinc-700 w-5 h-5 rounded flex items-center justify-center">0</span>
                  <span className="text-xs text-zinc-400">✊</span>
                </div>
                <div className="text-[11px] font-bold text-zinc-200 mt-1">HOVER</div>
                <div className="text-[9px] text-zinc-400">Stationary Evade</div>
              </button>

              <button
                onClick={() => handleSimulateGesture('SINGLE')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  handState.fingerCount === 1 && handState.detected
                    ? 'bg-sky-950 border-sky-500'
                    : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white bg-sky-600 w-5 h-5 rounded flex items-center justify-center">1</span>
                  <span className="text-xs text-sky-400">☝️</span>
                </div>
                <div className="text-[11px] font-bold text-sky-300 mt-1">SINGLE</div>
                <div className="text-[9px] text-zinc-400">Kinetic Pulse</div>
              </button>

              <button
                onClick={() => handleSimulateGesture('RAPID')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  handState.fingerCount === 2 && handState.detected
                    ? 'bg-emerald-950 border-emerald-500'
                    : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white bg-emerald-600 w-5 h-5 rounded flex items-center justify-center">2</span>
                  <span className="text-xs text-emerald-400">✌️</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-300 mt-1">RAPID</div>
                <div className="text-[9px] text-zinc-400">Twin Cannons</div>
              </button>

              <button
                onClick={() => handleSimulateGesture('PLASMA')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  handState.fingerCount === 3 && handState.detected
                    ? 'bg-cyan-950 border-cyan-500'
                    : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white bg-cyan-600 w-5 h-5 rounded flex items-center justify-center">3</span>
                  <span className="text-xs text-cyan-400">🤟</span>
                </div>
                <div className="text-[11px] font-bold text-cyan-300 mt-1">PLASMA</div>
                <div className="text-[9px] text-zinc-400">Blast Sphere</div>
              </button>

              <button
                onClick={() => handleSimulateGesture('ESCORT')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  handState.fingerCount === 4 && handState.detected
                    ? 'bg-amber-950 border-amber-500'
                    : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white bg-amber-600 w-5 h-5 rounded flex items-center justify-center">4</span>
                  <span className="text-xs text-amber-400">🖖</span>
                </div>
                <div className="text-[11px] font-bold text-amber-300 mt-1">ESCORT</div>
                <div className="text-[9px] text-zinc-400">Twin Wingmen</div>
              </button>

              <button
                onClick={() => handleSimulateGesture('LASER')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  handState.fingerCount === 5 && handState.detected
                    ? 'bg-rose-950 border-rose-500'
                    : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white bg-rose-600 w-5 h-5 rounded flex items-center justify-center">5</span>
                  <span className="text-xs text-rose-400">🖐️</span>
                </div>
                <div className="text-[11px] font-bold text-rose-300 mt-1">BEAM</div>
                <div className="text-[9px] text-zinc-400">Piercing Laser</div>
              </button>
            </div>

            {/* Game Canvas & Integrated Bottom-Right Optical Sensors Webcam PIP */}
            <div className="relative flex justify-center">
              {/* Main 3D Flight Simulation Stage */}
              <GameCanvas
                handState={handState}
                handStateRef={handStateRef}
                onHandUpdate={setHandState}
                onSimulateGesture={handleSimulateGesture}
              />
            </div>

            {/* Instructions & Features Card */}
            <div className="max-w-[840px] mx-auto bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-200">
                  🎯 3D Drone Flight &amp; Tactical Weapons: Guide your hand to navigate the drone through the corridor.
                </p>
                <p className="mt-0.5">
                  Show 0 fingers (Fist) to hover, 1 finger for single bullet, 2 for rapid stream, 3 for plasma sphere, 4 to summon escort wingmen, and 5 for continuous laser beam.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('python')}
                className="shrink-0 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Get Python Code (.ZIP)</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'python' && (
          <PythonProjectHub />
        )}

        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <PythonProjectHub />
          </div>
        )}
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>
          AERO-STRIKE 3D • Real-Time Computer Vision Drone Combat Simulation
        </p>
      </footer>
    </div>
  );
}
