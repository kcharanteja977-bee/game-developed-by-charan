/**
 * GameCanvas.tsx - Real-Time 3D Fighter Jet Flight Combat Stage
 * Integrates:
 * - Three.js WebGL rendering loop
 * - Military glass-cockpit HUD
 * - Floating Optical Sensors Webcam PIP in bottom-right corner
 * - Calibration wizard, main menu, pause state, and game over results
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import { HUD } from '../ui/HUD';
import { MenuOverlay } from '../ui/MenuOverlay';
import { CalibrationModal } from '../ui/CalibrationModal';
import { ResultsModal } from '../ui/ResultsModal';
import { WebcamHandTracker } from './WebcamHandTracker';
import { AudioManager } from '../audio/AudioManager';
import { FlightTelemetry, HandState, GameMode } from '../types';

interface GameCanvasProps {
  handState?: HandState;
  handStateRef?: React.MutableRefObject<HandState>;
  onHandUpdate?: (state: HandState) => void;
  onSimulateGesture?: (action: 'SHOOT' | 'BOMB' | 'SHIELD' | 'STOP') => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  handState,
  handStateRef,
  onHandUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game state machine
  const [gameMode, setGameMode] = useState<GameMode>('MENU');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [pipVisible, setPipVisible] = useState<boolean>(true);

  // Throttled HUD telemetry
  const [telemetry, setTelemetry] = useState<FlightTelemetry>({
    score: 0,
    highScore: 0,
    health: 100,
    lives: 3,
    shieldEnergy: 100,
    isShieldActive: false,
    gameOver: false,
    wave: 1,
    machSpeed: 1.3,
    altitude: 32000,
    combo: 0,
    comboMultiplier: 1,
    enemiesDestroyed: 0,
    fps: 60,
    rapidFireSeconds: 0,
    tripleShotSeconds: 0,
    targetLocks: [],
  });

  const defaultHandState: HandState = {
    detected: false,
    handX: 0.5,
    handY: 0.5,
    fingerCount: 0,
    gesture: 'NONE',
    action: 'HOLD FIRE',
  };

  const currentHandState = handStateRef?.current || handState || defaultHandState;

  // Initialize GameEngine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    engine.onTelemetry((telem) => {
      setTelemetry(telem);
      if (telem.gameOver && gameMode === 'PLAYING') {
        setGameMode('GAMEOVER');
      }
    });

    setIsMuted(AudioManager.getInstance().getMuted());

    // Continuously pipe handStateRef to engine
    let active = true;
    const syncHandLoop = () => {
      if (!active) return;
      if (handStateRef?.current) {
        engine.setHandState(handStateRef.current);
      }
      requestAnimationFrame(syncHandLoop);
    };
    requestAnimationFrame(syncHandLoop);

    return () => {
      active = false;
      engine.dispose();
      engineRef.current = null;
    };
  }, [handStateRef]);

  // Keyboard navigation & controls fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameMode === 'PLAYING') {
          engineRef.current?.pause();
          setGameMode('PAUSED');
        } else if (gameMode === 'PAUSED') {
          engineRef.current?.start();
          setGameMode('PLAYING');
        }
      }

      // Keyboard flight controls fallback (Arrow keys or WASD)
      if (gameMode === 'PLAYING' && handStateRef) {
        let currentX = handStateRef.current.handX;
        let currentY = handStateRef.current.handY;

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          currentX = Math.max(0.1, currentX - 0.08);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          currentX = Math.min(0.9, currentX + 0.08);
        }

        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          currentY = Math.max(0.1, currentY - 0.08);
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          currentY = Math.min(0.9, currentY + 0.08);
        }

        if (e.key === ' ' || e.key === '1') {
          handStateRef.current = {
            ...handStateRef.current,
            detected: true,
            gesture: 'ONE_FINGER',
            action: 'SHOOT LASER',
            handX: currentX,
            handY: currentY,
          };
        } else if (e.key === '2' || e.key === 'm' || e.key === 'M') {
          handStateRef.current = {
            ...handStateRef.current,
            detected: true,
            gesture: 'TWO_FINGERS',
            action: 'AOE BOMB',
            handX: currentX,
            handY: currentY,
          };
        } else if (e.key === 'e' || e.key === 'E') {
          handStateRef.current = {
            ...handStateRef.current,
            detected: true,
            gesture: 'OPEN_PALM',
            action: 'ENERGY SHIELD',
            handX: currentX,
            handY: currentY,
          };
        } else {
          handStateRef.current = {
            ...handStateRef.current,
            detected: true,
            handX: currentX,
            handY: currentY,
          };
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, handStateRef]);

  const handleStartSortie = useCallback(() => {
    AudioManager.getInstance().playUiClick();
    engineRef.current?.restart();
    setGameMode('PLAYING');
  }, []);

  const handleStartCalibration = useCallback(() => {
    AudioManager.getInstance().playUiClick();
    setGameMode('CALIBRATING');
  }, []);

  const handleCalibrationComplete = useCallback(() => {
    AudioManager.getInstance().playUiClick();
    engineRef.current?.restart();
    setGameMode('PLAYING');
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = AudioManager.getInstance().toggleMuted();
    setIsMuted(nextMuted);
  }, []);

  const handlePause = useCallback(() => {
    AudioManager.getInstance().playUiClick();
    engineRef.current?.pause();
    setGameMode('PAUSED');
  }, []);

  const handleResume = useCallback(() => {
    AudioManager.getInstance().playUiClick();
    engineRef.current?.start();
    setGameMode('PLAYING');
  }, []);

  const handleRetry = useCallback(() => {
    AudioManager.getInstance().playUiClick();
    engineRef.current?.restart();
    setGameMode('PLAYING');
  }, []);

  const handleMainMenu = useCallback(() => {
    AudioManager.getInstance().playUiClick();
    engineRef.current?.pause();
    setGameMode('MENU');
  }, []);

  return (
    <div className="relative w-full h-[620px] sm:h-[660px] lg:h-[700px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/60 shadow-[0_8px_40px_rgba(0,0,0,0.5)] flex items-center justify-center select-none font-mono">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Military HUD during Gameplay */}
      {(gameMode === 'PLAYING' || gameMode === 'PAUSED') && (
        <HUD
          telemetry={telemetry}
          handState={currentHandState}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onCalibrate={handleStartCalibration}
        />
      )}

      {/* Main Menu Overlay */}
      {gameMode === 'MENU' && (
        <MenuOverlay
          onStartGame={handleStartSortie}
          onStartCalibration={handleStartCalibration}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          highScore={telemetry.highScore}
        />
      )}

      {/* Calibration Wizard */}
      {gameMode === 'CALIBRATING' && (
        <CalibrationModal
          handState={currentHandState}
          onComplete={handleCalibrationComplete}
          onSkip={handleStartSortie}
        />
      )}

      {/* Pause Screen */}
      {gameMode === 'PAUSED' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="p-8 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl flex flex-col items-center text-center max-w-xs">
            <h3 className="text-2xl font-black text-cyan-300 tracking-wider mb-2">
              SIMULATION PAUSED
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Aircraft holding loiter position. Press Resume to re-engage.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleResume}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-wider text-sm transition-all cursor-pointer"
              >
                RESUME SORTIE
              </button>
              <button
                onClick={handleMainMenu}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                ABORT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results / Mission Concluded Modal */}
      {gameMode === 'GAMEOVER' && (
        <ResultsModal
          telemetry={telemetry}
          onRetry={handleRetry}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Floating Optical Sensors Webcam Panel in Bottom-Right Corner */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 pointer-events-auto">
        <WebcamHandTracker
          onHandUpdate={onHandUpdate || (() => {})}
          handStateRef={handStateRef}
          pipVisible={pipVisible}
          onTogglePip={() => setPipVisible(!pipVisible)}
          onCalibrate={handleStartCalibration}
        />
      </div>
    </div>
  );
};
