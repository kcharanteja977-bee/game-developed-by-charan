/**
 * App.tsx - Hand Gesture Airplane Shooter
 * Provides live webcam-based gameplay in browser, real-time MediaPipe hand tracking,
 * and complete Python 3 (Pygame + OpenCV + MediaPipe) desktop project download & guide.
 */

import React, { useState } from 'react';
import { 
  Gamepad2, Code2, BookOpen, Video, Eye, EyeOff, 
  HelpCircle, Shield, Crosshair, Sparkles, Plane, Download
} from 'lucide-react';
import { GameCanvas } from './components/GameCanvas';
import { WebcamHandTracker } from './components/WebcamHandTracker';
import { PythonProjectHub } from './components/PythonProjectHub';
import { HandState, GestureType, ActionType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'game' | 'python' | 'guide'>('game');
  const [pipVisible, setPipVisible] = useState(true);

  // Global hand state communicated from WebcamHandTracker to GameCanvas
  const [handState, setHandState] = useState<HandState>({
    detected: false,
    handX: 0.5,
    handY: 0.5,
    fingerCount: 0,
    gesture: 'NONE',
    action: 'HOLD FIRE',
  });

  // Manual gesture simulator buttons (for instant testing with or without webcam)
  const handleSimulateGesture = (action: 'SHOOT' | 'BOMB' | 'SHIELD' | 'STOP') => {
    let gesture: GestureType = 'NONE';
    let actionType: ActionType = 'HOLD FIRE';
    let fingerCount = 0;

    if (action === 'SHOOT') {
      gesture = 'ONE_FINGER';
      actionType = 'SHOOT LASER';
      fingerCount = 1;
    } else if (action === 'BOMB') {
      gesture = 'TWO_FINGERS';
      actionType = 'AOE BOMB';
      fingerCount = 2;
    } else if (action === 'SHIELD') {
      gesture = 'OPEN_PALM';
      actionType = 'ENERGY SHIELD';
      fingerCount = 5;
    } else {
      gesture = 'FIST';
      actionType = 'HOLD FIRE';
      fingerCount = 0;
    }

    setHandState((prev) => ({
      ...prev,
      detected: true,
      fingerCount,
      gesture,
      action: actionType,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400">
                <Plane className="w-5 h-5 -rotate-45" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">
                  SkyGesture Fighter
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  MediaPipe + Pygame
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Webcam Hand-Gesture Controlled 2D Airplane Combat
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
              <span>Play In Browser</span>
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
              <span>Python Source & ZIP</span>
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
              <span>Windows Guide</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'game' && (
          <div className="space-y-6">
            {/* Gesture Quick Reference Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">☝️</span>
                <div>
                  <div className="text-xs font-bold text-yellow-300">1 Finger (Index)</div>
                  <div className="text-[11px] text-slate-400">Normal Plasma Laser</div>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">✌️</span>
                <div>
                  <div className="text-xs font-bold text-orange-400">2 Fingers (V Sign)</div>
                  <div className="text-[11px] text-slate-400">Special AOE Bomb Attack</div>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">✋</span>
                <div>
                  <div className="text-xs font-bold text-cyan-300">Open Palm (4-5)</div>
                  <div className="text-[11px] text-slate-400">Energy Shield Barrier</div>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">✊</span>
                <div>
                  <div className="text-xs font-bold text-slate-300">Closed Fist (0)</div>
                  <div className="text-[11px] text-slate-400">Cease Fire / Cruise</div>
                </div>
              </div>
            </div>

            {/* Game Canvas & Webcam PIP Layout */}
            <div className="relative flex justify-center">
              {/* Main Game Stage */}
              <GameCanvas
                handState={handState}
                onSimulateGesture={handleSimulateGesture}
              />

              {/* Floating MediaPipe Webcam PIP (Top Right) */}
              <div className="absolute top-14 right-2 sm:right-6 z-10">
                <WebcamHandTracker
                  onHandUpdate={setHandState}
                  pipVisible={pipVisible}
                  onTogglePip={() => setPipVisible(!pipVisible)}
                />
              </div>
            </div>

            {/* Instructions & Features Card */}
            <div className="max-w-[840px] mx-auto bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-200">
                  ✈️ Hand Steering Tip: Move your hand left and right in front of your camera.
                </p>
                <p className="mt-0.5">
                  The airplane smoothly tracks your hand horizontal position. You can also use arrow keys or mouse pointer as a backup.
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
          Hand-Gesture Airplane Shooter • Python 3, Pygame, OpenCV & MediaPipe Hands
        </p>
      </footer>
    </div>
  );
}
