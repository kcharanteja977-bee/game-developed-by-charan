/**
 * WebcamHandTracker.tsx
 * Manages webcam access, Google MediaPipe Hands tracking in browser,
 * finger counting, and renders real-time skeleton overlay on a PIP preview.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Video, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { HandState, GestureType, ActionType } from '../types';

interface WebcamHandTrackerProps {
  onHandUpdate: (state: HandState) => void;
  pipVisible: boolean;
  onTogglePip: () => void;
}

// Global MediaPipe types from CDN script
declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}

export const WebcamHandTracker: React.FC<WebcamHandTrackerProps> = ({
  onHandUpdate,
  pipVisible,
  onTogglePip,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectorReady, setDetectorReady] = useState(false);
  const [fingerCount, setFingerCount] = useState(0);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('NONE');
  const [currentAction, setCurrentAction] = useState<ActionType>('HOLD FIRE');

  const handsRef = useRef<any>(null);
  const cameraUtilRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize MediaPipe Hands if available
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const initMediaPipe = () => {
      if (typeof window !== 'undefined' && window.Hands) {
        try {
          const hands = new window.Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
          });

          hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6,
          });

          hands.onResults(handleMediaPipeResults);
          handsRef.current = hands;
          setDetectorReady(true);
          return true;
        } catch (err) {
          console.error("MediaPipe init error:", err);
        }
      }
      return false;
    };

    if (!initMediaPipe()) {
      checkInterval = setInterval(() => {
        if (initMediaPipe()) {
          clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  const handleMediaPipeResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mirror horizontal for natural web preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // Draw video feed frame
    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    let detected = false;
    let handX = 0.5;
    let handY = 0.5;
    let count = 0;
    let gesture: GestureType = 'NONE';
    let action: ActionType = 'HOLD FIRE';

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      detected = true;
      const landmarks = results.multiHandLandmarks[0];

      // Hand center X (landmark 9 MCP)
      // Because we flipped horizontally, 1 - lm.x matches the player's physical right/left
      handX = 1 - landmarks[9].x;
      handY = landmarks[9].y;

      // Finger states
      const lm = landmarks;
      const fingersUp: boolean[] = [];

      // 1. Thumb: check horizontal extension & vertical tip
      const thumbDist = Math.abs(lm[4].x - lm[2].x);
      fingersUp.push(lm[4].y < lm[3].y && thumbDist > 0.04);

      // 2. Index: tip 8 < pip 6
      fingersUp.push(lm[8].y < lm[6].y);

      // 3. Middle: tip 12 < pip 10
      fingersUp.push(lm[12].y < lm[10].y);

      // 4. Ring: tip 16 < pip 14
      fingersUp.push(lm[16].y < lm[14].y);

      // 5. Pinky: tip 20 < pip 18
      fingersUp.push(lm[20].y < lm[18].y);

      count = fingersUp.filter(Boolean).length;

      // Gesture Classification
      if (count === 0) {
        gesture = 'FIST';
        action = 'HOLD FIRE';
      } else if (count === 1 && fingersUp[1]) {
        gesture = 'ONE_FINGER';
        action = 'SHOOT LASER';
      } else if (count === 2 && fingersUp[1] && fingersUp[2]) {
        gesture = 'TWO_FINGERS';
        action = 'AOE BOMB';
      } else if (count >= 4) {
        gesture = 'OPEN_PALM';
        action = 'ENERGY SHIELD';
      } else if (count === 1) {
        gesture = 'ONE_FINGER';
        action = 'SHOOT LASER';
      } else if (count === 2) {
        gesture = 'TWO_FINGERS';
        action = 'AOE BOMB';
      } else {
        gesture = 'NONE';
        action = 'HOLD FIRE';
      }

      // Draw skeleton connections
      drawSkeleton(ctx, landmarks, canvas.width, canvas.height, gesture);
    }

    ctx.restore();

    setFingerCount(count);
    setCurrentGesture(gesture);
    setCurrentAction(action);

    onHandUpdate({
      detected,
      handX: Math.max(0.05, Math.min(0.95, handX)),
      handY,
      fingerCount: count,
      gesture,
      action,
      landmarks: results.multiHandLandmarks ? results.multiHandLandmarks[0] : undefined,
    });
  };

  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number, gesture: GestureType) => {
    // Hand connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [9, 13], [13, 14], [14, 15], [15, 16],// Ring
      [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [0, 17]                               // Palm base
    ];

    let boneColor = '#38bdf8'; // Sky blue default
    if (gesture === 'ONE_FINGER') boneColor = '#facc15'; // Laser yellow
    if (gesture === 'TWO_FINGERS') boneColor = '#f97316'; // Bomb orange
    if (gesture === 'OPEN_PALM') boneColor = '#22c55e'; // Shield green
    if (gesture === 'FIST') boneColor = '#94a3b8'; // Fist gray

    ctx.lineWidth = 3;
    ctx.strokeStyle = boneColor;

    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      const isTip = [4, 8, 12, 16, 20].includes(i);
      ctx.fillStyle = isTip ? '#ffffff' : boneColor;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, isTip ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // If MediaPipe Camera util is available, hook it up
        if (typeof window !== 'undefined' && window.Camera && handsRef.current) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 320,
            height: 240,
          });
          camera.start();
          cameraUtilRef.current = camera;
        } else {
          // Fallback animation frame loop
          const loop = async () => {
            if (videoRef.current && handsRef.current && cameraActive) {
              await handsRef.current.send({ image: videoRef.current });
              requestAnimationFrame(loop);
            }
          };
          requestAnimationFrame(loop);
        }

        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? "Camera permission denied by browser. Click the lock icon in address bar to allow webcam access."
          : `Webcam error: ${err.message || 'Device not found'}. You can still use the on-screen gesture simulator!`
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
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
    onHandUpdate({
      detected: false,
      handX: 0.5,
      handY: 0.5,
      fingerCount: 0,
      gesture: 'NONE',
      action: 'HOLD FIRE',
    });
  };

  return (
    <div className="relative">
      {/* Hidden processing video element */}
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />

      {/* Floating Picture-in-Picture Webcam Panel */}
      {pipVisible && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl transition-all duration-200">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/60 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>MediaPipe Live Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <button
                onClick={onTogglePip}
                className="text-slate-400 hover:text-slate-200"
                title="Minimize Webcam PIP"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative w-56 h-42 bg-slate-950 flex items-center justify-center">
            {cameraActive ? (
              <canvas
                ref={canvasRef}
                width={224}
                height={168}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-3">
                <CameraOff className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400 font-medium">Webcam Inactive</p>
                <button
                  onClick={startCamera}
                  className="mt-2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-md transition shadow"
                >
                  Enable Webcam
                </button>
              </div>
            )}

            {/* In-video status tag */}
            {cameraActive && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-emerald-300">
                  Fingers: {fingerCount}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    currentAction === 'SHOOT LASER'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : currentAction === 'AOE BOMB'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : currentAction === 'ENERGY SHIELD'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                  }`}
                >
                  {currentGesture}
                </span>
              </div>
            )}
          </div>

          {/* Quick toggle bar */}
          <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
            {cameraActive ? (
              <button
                onClick={stopCamera}
                className="w-full py-1 px-2 text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 rounded flex items-center justify-center gap-1.5 transition"
              >
                <CameraOff className="w-3.5 h-3.5" />
                Turn Off Camera
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="w-full py-1 px-2 text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 rounded flex items-center justify-center gap-1.5 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                Start Camera
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Show PIP button if hidden */}
      {!pipVisible && (
        <button
          onClick={onTogglePip}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-600 shadow-md transition"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          Show Webcam PIP
        </button>
      )}

      {/* Camera error toast */}
      {cameraError && (
        <div className="mt-2 p-2.5 bg-amber-950/70 border border-amber-800/60 rounded-lg text-amber-200 text-xs flex items-start gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{cameraError}</p>
            <p className="mt-1 text-slate-400 text-[11px]">
              Use the on-screen gesture simulator buttons below to play without a webcam!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
