/**
 * WebcamHandTracker.tsx
 * High-performance browser webcam hand tracker powered by Google MediaPipe Hands.
 * Features:
 * - Angle-invariant 3D skeletal tracking via GestureRecognizer
 * - Mirrored webcam view with illuminated joints and active fingertip targeting rings
 * - Real-time telemetry badges: OPTICAL SENSORS, HAND DETECTED, FINGER COUNT, GESTURE
 * - Instant "CALIBRATE" trigger and graceful permission handling
 * - Zero-latency ref sync with Three.js 60 FPS flight loop
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Video, Eye, EyeOff, AlertCircle, Sparkles, SlidersHorizontal } from 'lucide-react';
import { HandState, GestureType, ActionType } from '../types';
import { GestureRecognizer } from '../vision/GestureRecognizer';

interface WebcamHandTrackerProps {
  onHandUpdate: (state: HandState) => void;
  handStateRef?: React.MutableRefObject<HandState>;
  pipVisible: boolean;
  onTogglePip: () => void;
  onCalibrate?: () => void;
}

// Global MediaPipe window interface
declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}

export const WebcamHandTracker: React.FC<WebcamHandTrackerProps> = ({
  onHandUpdate,
  handStateRef,
  pipVisible,
  onTogglePip,
  onCalibrate,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectorReady, setDetectorReady] = useState(false);
  const [fingerCount, setFingerCount] = useState(0);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('NONE');
  const [currentAction, setCurrentAction] = useState<ActionType>('HOLD FIRE');
  const [handDetected, setHandDetected] = useState(false);

  const handsRef = useRef<any>(null);
  const cameraUtilRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const recognizerRef = useRef(new GestureRecognizer());

  // Position smoothing state (exponential moving average)
  const smoothPosRef = useRef({ x: 0.5, y: 0.5, initialized: false });

  // Last emitted state to prevent wasteful React renders
  const lastEmittedStateRef = useRef<{ gesture: GestureType; action: ActionType; detected: boolean }>({
    gesture: 'NONE',
    action: 'HOLD FIRE',
    detected: false,
  });

  // Stop camera cleanup
  const stopCamera = useCallback(() => {
    if (cameraUtilRef.current) {
      try {
        cameraUtilRef.current.stop();
      } catch {}
      cameraUtilRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setHandDetected(false);

    const resetState: HandState = {
      detected: false,
      handX: 0.5,
      handY: 0.5,
      fingerCount: 0,
      gesture: 'NONE',
      action: 'HOLD FIRE',
    };
    if (handStateRef) {
      handStateRef.current = resetState;
    }
    onHandUpdate(resetState);
  }, [handStateRef, onHandUpdate]);

  // Start webcam
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320, max: 480 },
          height: { ideal: 240, max: 360 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user',
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // If MediaPipe Camera util is available, hook it up
        if (typeof window !== 'undefined' && window.Camera && handsRef.current) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (isProcessingRef.current) return;
              if (videoRef.current && handsRef.current) {
                isProcessingRef.current = true;
                try {
                  await handsRef.current.send({ image: videoRef.current });
                } catch (err) {
                  console.warn('Hand frame error:', err);
                } finally {
                  isProcessingRef.current = false;
                }
              }
            },
            width: 320,
            height: 240,
          });
          camera.start();
          cameraUtilRef.current = camera;
        } else {
          // Frame loop fallback
          let active = true;
          const loop = async () => {
            if (!active) return;
            if (videoRef.current && handsRef.current && !isProcessingRef.current) {
              isProcessingRef.current = true;
              try {
                await handsRef.current.send({ image: videoRef.current });
              } catch (err) {
                console.warn('Fallback frame error:', err);
              } finally {
                isProcessingRef.current = false;
              }
            }
            requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
        }

        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access prompt/error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Webcam permission was dismissed or blocked. Click Enable Webcam to grant access.');
      } else {
        setCameraError(`Camera offline: ${err.message || 'Device unavailable'}`);
      }
      setCameraActive(false);
    }
  }, []);

  // Initialize MediaPipe Hands
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const initMediaPipe = () => {
      if (typeof window !== 'undefined' && window.Hands) {
        try {
          const hands = new window.Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
          });

          // Model Complexity 0 (Lite) for optimal real-time browser performance
          hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          hands.onResults(handleMediaPipeResults);
          handsRef.current = hands;
          setDetectorReady(true);

          // Auto-start camera once detector is loaded
          startCamera();
          return true;
        } catch (err) {
          console.error('MediaPipe initialization error:', err);
        }
      }
      return false;
    };

    if (!initMediaPipe()) {
      checkInterval = setInterval(() => {
        if (initMediaPipe()) {
          clearInterval(checkInterval);
        }
      }, 250);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Results callback from MediaPipe
  const handleMediaPipeResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mirror horizontal for natural preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    let detected = false;
    let handX = 0.5;
    let handY = 0.5;
    let count = 0;
    let gesture: GestureType = 'NONE';
    let action: ActionType = 'HOLD FIRE';
    let extendedFlags = [false, false, false, false, false];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      detected = true;
      const lm = results.multiHandLandmarks[0];

      // Hand center X and Y (Middle MCP 9 provides stable hand center of gravity)
      const rawHandX = 1 - lm[9].x;
      const rawHandY = lm[9].y;

      // Exponential moving average smoothing
      if (!smoothPosRef.current.initialized) {
        smoothPosRef.current.x = rawHandX;
        smoothPosRef.current.y = rawHandY;
        smoothPosRef.current.initialized = true;
      } else {
        const alpha = 0.45;
        smoothPosRef.current.x += (rawHandX - smoothPosRef.current.x) * alpha;
        smoothPosRef.current.y += (rawHandY - smoothPosRef.current.y) * alpha;
      }

      handX = Math.max(0.04, Math.min(0.96, smoothPosRef.current.x));
      handY = Math.max(0.04, Math.min(0.96, smoothPosRef.current.y));

      // Classify gesture using 3D angle-invariant algorithm
      const classification = recognizerRef.current.classify(lm);
      gesture = classification.gesture;
      action = classification.action;
      count = classification.fingerCount;
      extendedFlags = classification.extended;

      // Draw skeleton & illuminated fingertip targets
      drawSkeleton(ctx, lm, canvas.width, canvas.height, gesture, extendedFlags);
    } else {
      smoothPosRef.current.initialized = false;
    }

    ctx.restore();

    // 1. Immediately pipe to mutable ref for zero-latency 60FPS Three.js loop
    const updatedState: HandState = {
      detected,
      handX,
      handY,
      fingerCount: count,
      gesture,
      action,
      landmarks: results.multiHandLandmarks ? results.multiHandLandmarks[0] : undefined,
    };

    if (handStateRef) {
      handStateRef.current = updatedState;
    }

    // 2. Update React UI states when values change
    const last = lastEmittedStateRef.current;
    if (last.gesture !== gesture || last.action !== action || last.detected !== detected) {
      lastEmittedStateRef.current = { gesture, action, detected };
      setHandDetected(detected);
      setFingerCount(count);
      setCurrentGesture(gesture);
      setCurrentAction(action);
      onHandUpdate(updatedState);
    }
  };

  const drawSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    w: number,
    h: number,
    gesture: GestureType,
    extendedFlags: boolean[]
  ) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17],
    ];

    let boneColor = '#06b6d4'; // Cyan default
    if (gesture === 'ONE_FINGER') boneColor = '#eab308'; // Laser yellow
    if (gesture === 'TWO_FINGERS') boneColor = '#f97316'; // Missile orange
    if (gesture === 'OPEN_PALM') boneColor = '#10b981'; // Shield emerald
    if (gesture === 'FIST') boneColor = '#94a3b8'; // Neutral slate

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = boneColor;

    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }

    // Joint landmarks
    const tipIndices = [4, 8, 12, 16, 20];
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      const tipIndexPos = tipIndices.indexOf(i);
      const isTip = tipIndexPos !== -1;
      const isExtended = isTip && extendedFlags[tipIndexPos];

      ctx.beginPath();
      if (isTip && isExtended) {
        // Glowing target ring for extended fingertips
        ctx.fillStyle = '#ffffff';
        ctx.arc(p.x * w, p.y * h, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = boneColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 8.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = isTip ? '#e2e8f0' : boneColor;
        ctx.arc(p.x * w, p.y * h, isTip ? 3.0 : 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  return (
    <div className="relative select-none font-mono">
      {/* Video element positioned invisibly offscreen (NEVER display: none) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '320px',
          height: '240px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* Floating Picture-in-Picture Optical Sensors Panel */}
      {pipVisible && (
        <div className="w-64 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.6)]">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-300">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>OPTICAL SENSORS</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  cameraActive && handDetected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : cameraActive
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
                title={cameraActive ? (handDetected ? 'Hand Locked' : 'Searching for Hand') : 'Sensors Offline'}
              />
              <button
                onClick={onTogglePip}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Minimize Panel"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Video Feed Canvas */}
          <div className="relative w-full h-40 bg-slate-950 flex items-center justify-center overflow-hidden">
            {cameraActive ? (
              <canvas
                ref={canvasRef}
                width={256}
                height={160}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-3">
                <CameraOff className="w-7 h-7 text-slate-600 mx-auto mb-1.5" />
                <p className="text-[11px] text-slate-400 font-semibold">Webcam Standby</p>
                <button
                  onClick={startCamera}
                  className="mt-2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] rounded transition shadow cursor-pointer"
                >
                  Enable Webcam
                </button>
              </div>
            )}

            {/* In-video live telemetry badges */}
            {cameraActive && (
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    handDetected
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900/80 text-slate-400 border border-slate-700'
                  }`}
                >
                  {handDetected ? 'HAND DETECTED' : 'SEARCHING...'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] text-cyan-300 font-bold">
                  FINGERS: {fingerCount}
                </span>
              </div>
            )}

            {cameraActive && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                    currentAction === 'SHOOT LASER'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                      : currentAction === 'AOE BOMB'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50'
                      : currentAction === 'ENERGY SHIELD'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-900/80 text-slate-400 border border-slate-700'
                  }`}
                >
                  {currentGesture}
                </span>
                <span className="text-[10px] text-slate-300 font-bold drop-shadow">
                  {currentAction}
                </span>
              </div>
            )}
          </div>

          {/* Quick Action Footer Bar */}
          <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
            {onCalibrate && (
              <button
                onClick={onCalibrate}
                className="flex-1 py-1 px-2 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-700/60 rounded flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                CALIBRATE
              </button>
            )}

            {cameraActive ? (
              <button
                onClick={stopCamera}
                className="py-1 px-2 text-[11px] font-medium text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                title="Turn off webcam"
              >
                <CameraOff className="w-3 h-3" />
                OFF
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="py-1 px-2 text-[11px] font-medium text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                title="Start webcam"
              >
                <Camera className="w-3 h-3" />
                ON
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating restore icon if minimized */}
      {!pipVisible && (
        <button
          onClick={onTogglePip}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 text-xs font-semibold rounded-lg border border-cyan-500/30 shadow-lg transition cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>OPTICAL SENSORS</span>
          <span
            className={`w-2 h-2 rounded-full ${
              handDetected ? 'bg-emerald-400' : cameraActive ? 'bg-amber-400' : 'bg-rose-500'
            }`}
          />
        </button>
      )}

      {/* Camera error toast */}
      {cameraError && (
        <div className="mt-2 p-2.5 bg-amber-950/80 border border-amber-700/60 rounded-lg text-amber-200 text-xs flex items-start gap-2 shadow-lg max-w-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[11px]">{cameraError}</p>
            <p className="mt-1 text-slate-400 text-[10px]">
              You can also steer with Mouse or Arrow Keys / Space to test immediately!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
