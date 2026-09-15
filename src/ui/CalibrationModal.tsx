/**
 * CalibrationModal.tsx - Optical Sensor Calibration Wizard
 * Calibrates user's webcam tracking through a guided 5-step sequence:
 * 1. Show your hand to the camera
 * 2. Move your hand LEFT
 * 3. Move your hand RIGHT
 * 4. Move your hand UP
 * 5. Move your hand DOWN
 * -> CONTROL SYSTEM READY
 */

import React, { useState, useEffect } from 'react';
import { Hand, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, CheckCircle2, Play } from 'lucide-react';
import { HandState } from '../types';

interface CalibrationModalProps {
  handState: HandState;
  onComplete: () => void;
  onSkip: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  handState,
  onComplete,
  onSkip,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  const steps = [
    {
      title: 'OPTICAL SENSOR CALIBRATION',
      desc: 'Show your hand to the camera to initialize 3D tracking.',
      icon: <Hand className="w-8 h-8 text-cyan-400 animate-pulse" />,
      check: (hand: HandState) => hand.detected,
    },
    {
      title: 'MOVE YOUR HAND LEFT',
      desc: 'Move your hand toward the left side of your camera view to calibrate horizontal banking.',
      icon: <ArrowLeft className="w-8 h-8 text-cyan-400" />,
      check: (hand: HandState) => hand.detected && hand.handX < 0.40,
    },
    {
      title: 'MOVE YOUR HAND RIGHT',
      desc: 'Move your hand toward the right side of your camera view to calibrate right bank limit.',
      icon: <ArrowRight className="w-8 h-8 text-cyan-400" />,
      check: (hand: HandState) => hand.detected && hand.handX > 0.60,
    },
    {
      title: 'MOVE YOUR HAND UP',
      desc: 'Move your hand upward to calibrate elevator climb pitch.',
      icon: <ArrowUp className="w-8 h-8 text-cyan-400" />,
      check: (hand: HandState) => hand.detected && hand.handY < 0.40,
    },
    {
      title: 'MOVE YOUR HAND DOWN',
      desc: 'Move your hand downward to calibrate elevator dive pitch.',
      icon: <ArrowDown className="w-8 h-8 text-cyan-400" />,
      check: (hand: HandState) => hand.detected && hand.handY > 0.60,
    },
    {
      title: 'CONTROL SYSTEM READY',
      desc: 'Optical sensors locked. Supersonic 3D flight control online!',
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
      check: () => true,
    },
  ];

  const currentStep = steps[stepIndex];

  // Progress timer for current step
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (stepIndex < steps.length - 1) {
      if (currentStep.check(handState)) {
        timer = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              setStepIndex((s) => s + 1);
              return 0;
            }
            return prev + 34;
          });
        }, 120);
      } else {
        setProgress(0);
      }
    }
    return () => clearInterval(timer);
  }, [handState, stepIndex, currentStep]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-mono">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.2)] flex flex-col items-center text-center">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? 'w-8 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                  : i < stepIndex
                  ? 'bg-emerald-500'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step Icon */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner mb-4">
          {currentStep.icon}
        </div>

        {/* Step Title & Description */}
        <h2 className="text-xl sm:text-2xl font-black text-cyan-300 tracking-wider mb-2">
          {currentStep.title}
        </h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          {currentStep.desc}
        </p>

        {/* Visual Calibration Meter */}
        {stepIndex < steps.length - 1 ? (
          <div className="w-full max-w-xs mb-8">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-semibold">
              <span>PROGRESS</span>
              <span className="text-cyan-400">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {handState.detected
                ? `Hand Detected (X: ${(handState.handX * 100).toFixed(0)}%, Y: ${(handState.handY * 100).toFixed(0)}%)`
                : 'Waiting for hand in front of camera...'}
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <button
              onClick={onComplete}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black tracking-wider text-base shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              START 3D FLIGHT
            </button>
          </div>
        )}

        {/* Bottom Skip Option */}
        <button
          onClick={onSkip}
          className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 cursor-pointer"
        >
          Skip Calibration & Play Now
        </button>
      </div>
    </div>
  );
};
