/**
 * WebcamPIP.tsx - Sleek Floating Glassmorphism Webcam & Skeleton HUD Panel
 * Overlays live MediaPipe Hand landmarks, skeleton connections,
 * glowing active fingertip markers, and confidence telemetry.
 */

import React from 'react';
import { Eye, EyeOff, Video, VideoOff } from 'lucide-react';
import { HandState } from '../types';

interface WebcamPIPProps {
  handState: HandState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraActive: boolean;
  cameraError: string | null;
  pipVisible: boolean;
  onTogglePip: () => void;
  onRetryCamera: () => void;
}

export const WebcamPIP: React.FC<WebcamPIPProps> = ({
  handState,
  videoRef,
  canvasRef,
  cameraActive,
  cameraError,
  pipVisible,
  onTogglePip,
  onRetryCamera,
}) => {
  return (
    <div className="flex flex-col items-end gap-1 select-none font-mono">
      {/* Toggle button */}
      <button
        onClick={onTogglePip}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-xs text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 backdrop-blur-md transition-all shadow-lg"
      >
        {pipVisible ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
        <span>{pipVisible ? 'HIDE SENSOR' : 'SHOW SENSOR'}</span>
      </button>

      {/* Floating glassmorphism camera panel */}
      {pipVisible && (
        <div className="relative w-48 sm:w-56 h-36 sm:h-40 rounded-xl overflow-hidden bg-slate-950/80 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-md transition-all">
          {/* Header pill */}
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-800 text-[10px]">
            <div
              className={`w-2 h-2 rounded-full ${
                handState.detected
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-slate-300 font-bold">
              {handState.detected ? 'TRACKING' : 'SEARCHING'}
            </span>
          </div>

          {/* Error fallback */}
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-950/95 z-20">
              <VideoOff className="w-6 h-6 text-rose-400 mb-1" />
              <div className="text-[10px] text-rose-300 leading-tight mb-2">{cameraError}</div>
              <button
                onClick={onRetryCamera}
                className="px-2 py-1 rounded bg-rose-600/30 border border-rose-500 text-[10px] text-white hover:bg-rose-600/50"
              >
                RETRY WEBCAM
              </button>
            </div>
          ) : !cameraActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-20">
              <Video className="w-5 h-5 text-cyan-400 animate-pulse mb-1" />
              <div className="text-[10px] text-cyan-300">STARTING CAMERA...</div>
            </div>
          ) : null}

          {/* Raw Video element (Hidden or blurred background) */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-30"
          />

          {/* Skeleton & Hand tracking overlay canvas */}
          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            className="absolute inset-0 w-full h-full object-cover z-10"
          />

          {/* Bottom telemetry badge */}
          <div className="absolute bottom-2 inset-x-2 z-20 flex items-center justify-between px-2 py-1 rounded bg-slate-950/85 border border-slate-800 text-[10px]">
            <span className="text-cyan-400 font-bold">{handState.gesture}</span>
            <span className="text-slate-400">
              {handState.detected ? `FINGERS: ${handState.fingerCount}` : 'NO HAND'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
