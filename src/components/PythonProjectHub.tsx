/**
 * PythonProjectHub.tsx
 * Allows users to inspect all Python source files, copy them with 1 click,
 * download the entire Python Pygame + MediaPipe project as a ready-to-run ZIP archive,
 * and review the beginner-friendly setup & compatibility guide.
 */

import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  Download, Copy, Check, Terminal, FileCode, 
  HelpCircle, AlertTriangle, Play, BookOpen, Layers, Monitor
} from 'lucide-react';
import { PYTHON_FILES, PythonFileItem } from '../pythonFilesData';

export const PythonProjectHub: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<PythonFileItem>(PYTHON_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'run' | 'compatibility' | 'architecture'>('run');

  const copyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('gesture_airplane_shooter');

      for (const file of PYTHON_FILES) {
        folder?.file(file.filename, file.code);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gesture_airplane_shooter.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner with 1-Click ZIP Download */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Terminal className="w-4 h-4" />
            <span>Standalone Python Desktop Project</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Python 3 + OpenCV + MediaPipe + Pygame
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Complete working codebase organized into clean, modular files. Ready to run on Windows, Mac, or Linux with 60 FPS real-time webcam hand tracking.
          </p>
        </div>

        <button
          onClick={downloadZip}
          disabled={isZipping}
          className="shrink-0 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2.5 transition active:scale-95 disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          <span>{isZipping ? 'Packaging ZIP...' : 'Download Project (.ZIP)'}</span>
        </button>
      </div>

      {/* Code Browser & File Explorer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* File Tabs Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {PYTHON_FILES.map((file) => (
              <button
                key={file.filename}
                onClick={() => setSelectedFile(file)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 whitespace-nowrap transition ${
                  selectedFile.filename === file.filename
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{file.filename}</span>
              </button>
            ))}
          </div>

          <button
            onClick={copyCode}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy File'}</span>
          </button>
        </div>

        {/* File Description bar */}
        <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{selectedFile.description}</span>
          <span className="uppercase text-[10px] text-slate-500 font-bold tracking-wider">
            {selectedFile.language}
          </span>
        </div>

        {/* Code Content Container */}
        <div className="p-4 bg-slate-950/70 overflow-x-auto max-h-[480px]">
          <pre className="text-xs font-mono text-slate-200 leading-relaxed tab-4">
            <code>{selectedFile.code}</code>
          </pre>
        </div>
      </div>

      {/* Guide Tabs & Documentation Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Beginner's Guide & Documentation</h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveGuideTab('run')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeGuideTab === 'run'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              How to Run on Windows
            </button>
            <button
              onClick={() => setActiveGuideTab('compatibility')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeGuideTab === 'compatibility'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MediaPipe Compatibility
            </button>
            <button
              onClick={() => setActiveGuideTab('architecture')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeGuideTab === 'architecture'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              How the Detection Works
            </button>
          </div>
        </div>

        {/* Tab 1: How to Run on Windows */}
        {activeGuideTab === 'run' && (
          <div className="space-y-4 text-sm text-slate-300">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">1</span>
                Quickest Method: 1-Click Batch Launcher (`run.bat`)
              </h4>
              <p className="text-slate-400 text-xs">
                Once you extract the downloaded ZIP on Windows, simply double-click <code className="text-cyan-300 font-mono">run.bat</code>! It automatically verifies Python, creates a virtual environment, installs dependencies, and launches the game.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h4 className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">2</span>
                Manual Setup in Command Prompt (CMD) or PowerShell
              </h4>
              <div className="space-y-2 font-mono text-xs">
                <div className="text-slate-400 font-sans text-xs">A. Open CMD inside the unzipped folder and create a virtual environment:</div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-emerald-300">
                  python -m venv venv
                </div>

                <div className="text-slate-400 font-sans text-xs pt-1">B. Activate the environment:</div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-emerald-300">
                  venv\Scripts\activate
                </div>

                <div className="text-slate-400 font-sans text-xs pt-1">C. Install dependencies with pip:</div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-emerald-300">
                  pip install -r requirements.txt
                </div>

                <div className="text-slate-400 font-sans text-xs pt-1">D. Start the game:</div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-emerald-300">
                  python main.py
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: MediaPipe Compatibility Solutions */}
        {activeGuideTab === 'compatibility' && (
          <div className="space-y-4 text-sm text-slate-300">
            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Common Issue: "No matching distribution found for mediapipe"</span>
              </div>
              <p className="text-slate-300 text-xs">
                MediaPipe distributes precompiled wheels exclusively for <strong>64-bit Python</strong> and works most reliably on <strong>Python 3.10 and 3.11</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider">Solution 1: Check Python Bit Architecture</h5>
                <p className="text-slate-400 text-xs">
                  Make sure you have 64-bit Python. Run this in your command prompt:
                </p>
                <div className="bg-slate-900 p-2 rounded text-xs font-mono text-cyan-300">
                  python -c "import struct; print(struct.calcsize('P') * 8)"
                </div>
                <p className="text-slate-400 text-xs">
                  If the output is <code>32</code>, uninstall Python and download the <strong>Windows x86-64 executable</strong> from python.org.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider">Solution 2: Python 3.12+ Fallback</h5>
                <p className="text-slate-400 text-xs">
                  If you are using Python 3.12, install Python 3.10 or 3.11 side-by-side using the Python Launcher:
                </p>
                <div className="bg-slate-900 p-2 rounded text-xs font-mono text-cyan-300">
                  py -3.10 -m venv venv<br/>
                  venv\Scripts\activate<br/>
                  pip install -r requirements.txt
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h5 className="font-bold text-white text-xs uppercase tracking-wider">Solution 3: Camera Not Found or Black Screen</h5>
              <p className="text-slate-400 text-xs">
                If the webcam preview doesn't turn on, change <code className="text-cyan-300 font-mono">CAMERA_INDEX = 0</code> in <code className="text-cyan-300 font-mono">settings.py</code> to <code className="text-cyan-300 font-mono">1</code> or <code className="text-cyan-300 font-mono">2</code> if you have an external webcam or virtual camera device connected.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: How the Detection Works */}
        {activeGuideTab === 'architecture' && (
          <div className="space-y-4 text-sm text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-cyan-400 text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  <span>Finger Extension Mathematics</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  MediaPipe outputs 21 3D landmarks for each detected hand. In computer graphics coordinate space, (0,0) is in the top-left corner. Thus:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono text-amber-300">
                  is_finger_up = landmark[TIP].y &lt; landmark[PIP].y
                </div>
                <p className="text-slate-400 text-xs">
                  When a finger is raised vertically, its fingertip has a smaller Y value than its knuckle (PIP).
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-cyan-400 text-xs uppercase tracking-wider">
                  <Monitor className="w-4 h-4" />
                  <span>Horizontal Flight Steering</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Landmark 9 represents the middle finger base (center of the palm). Its normalized horizontal position <code className="text-cyan-300 font-mono">x (0.0 to 1.0)</code> is smoothed using linear interpolation:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono text-teal-300">
                  player.x += (target_x - player.x) * 0.22
                </div>
                <p className="text-slate-400 text-xs">
                  This eliminates camera jitter and makes the fighter jet feel smooth and responsive.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
