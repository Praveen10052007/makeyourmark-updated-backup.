import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Sliders,
  Smartphone,
  ShieldCheck,
  HelpCircle,
  FlipHorizontal,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAvatarCaptured?: (dataUrl: string) => void;
}

type PermissionStatusType = 'granted' | 'prompt' | 'denied' | 'unsupported';

export const DevicePermissionsModal: React.FC<Props> = ({ isOpen, onClose, onAvatarCaptured }) => {
  const [micStatus, setMicStatus] = useState<PermissionStatusType>('prompt');
  const [camStatus, setCamStatus] = useState<PermissionStatusType>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio testing state
  const [testingMic, setTestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Camera testing state
  const [testingCam, setTestingCam] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);

  // Check initial permission statuses
  const checkPermissions = async () => {
    if (!navigator.permissions) return;

    try {
      // Microphone
      const micQuery = await navigator.permissions.query({ name: 'microphone' as any }).catch(() => null);
      if (micQuery) {
        setMicStatus(micQuery.state as PermissionStatusType);
        micQuery.onchange = () => setMicStatus(micQuery.state as PermissionStatusType);
      }
    } catch {
      // Some browsers don't support querying microphone
    }

    try {
      // Camera
      const camQuery = await navigator.permissions.query({ name: 'camera' as any }).catch(() => null);
      if (camQuery) {
        setCamStatus(camQuery.state as PermissionStatusType);
        camQuery.onchange = () => setCamStatus(camQuery.state as PermissionStatusType);
      }
    } catch {
      // Some browsers don't support querying camera
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkPermissions();
    } else {
      stopMicTest();
      stopCamTest();
    }
  }, [isOpen]);

  // Clean up media streams on unmount
  useEffect(() => {
    return () => {
      stopMicTest();
      stopCamTest();
    };
  }, []);

  // Request & Test Microphone
  const startMicTest = async () => {
    setErrorMessage(null);
    try {
      stopMicTest();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicStatus('granted');
      setTestingMic(true);

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setMicVolume(Math.min(100, Math.round((average / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err: any) {
      console.error(err);
      setMicStatus('denied');
      setTestingMic(false);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone access was denied. Please allow microphone permissions in your mobile browser address bar.'
          : 'Could not access microphone: ' + (err.message || 'Unknown error')
      );
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    setTestingMic(false);
    setMicVolume(0);
  };

  // Request & Test Camera
  const startCamTest = async (overrideFacing?: 'user' | 'environment') => {
    setErrorMessage(null);
    const mode = overrideFacing || facingMode;
    try {
      stopCamTest();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });
      camStreamRef.current = stream;
      setCamStatus('granted');
      setTestingCam(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error(err);
      setCamStatus('denied');
      setTestingCam(false);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera access was denied. Please allow camera permissions in your mobile browser settings.'
          : 'Could not access camera: ' + (err.message || 'Unknown error')
      );
    }
  };

  const stopCamTest = () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((track) => track.stop());
      camStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTestingCam(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (testingCam) {
      startCamTest(nextMode);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 320;
    canvas.height = videoRef.current.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedSnapshot(dataUrl);

    if (onAvatarCaptured) {
      onAvatarCaptured(dataUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#18181b] border border-zinc-800 p-6 shadow-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mobile Device Permissions</h2>
              <p className="text-xs text-zinc-400">
                Manage microphone and camera access for AI Voice and Mock Interviews.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* 1. MICROPHONE PERMISSION & LIVE TEST */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Microphone Access</h3>
                <p className="text-[11px] text-zinc-400">
                  Used for ChatGPT Voice Assistant and Voice Dictation in Mock Interviews.
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                micStatus === 'granted'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : micStatus === 'denied'
                  ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
              }`}
            >
              {micStatus === 'granted' ? 'Allowed' : micStatus === 'denied' ? 'Blocked' : 'Needs Prompt'}
            </span>
          </div>

          {/* Test Buttons & Live Volume Bar */}
          <div className="flex items-center gap-3 pt-1">
            {!testingMic ? (
              <button
                type="button"
                onClick={startMicTest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Test Microphone</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopMicTest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Mic Test</span>
              </button>
            )}

            {testingMic && (
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">Volume:</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-75"
                    style={{ width: `${Math.max(5, micVolume)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-amber-300 w-8">{micVolume}%</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. CAMERA PERMISSION & LIVE PREVIEW */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Camera Access</h3>
                <p className="text-[11px] text-zinc-400">
                  Used for video mock simulation, avatar photos, and document scans.
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                camStatus === 'granted'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : camStatus === 'denied'
                  ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
              }`}
            >
              {camStatus === 'granted' ? 'Allowed' : camStatus === 'denied' ? 'Blocked' : 'Needs Prompt'}
            </span>
          </div>

          {/* Test Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {!testingCam ? (
              <button
                type="button"
                onClick={() => startCamTest()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Test Camera</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={stopCamTest}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>

                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                  title="Switch between front and back camera on mobile"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>{facingMode === 'user' ? 'Front' : 'Back'} Camera</span>
                </button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Snap Profile Pic</span>
                </button>
              </>
            )}
          </div>

          {/* Video Preview Canvas */}
          {testingCam && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-zinc-700 mt-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-amber-300 font-mono">
                LIVE CAMERA PREVIEW ({facingMode})
              </div>
            </div>
          )}

          {capturedSnapshot && (
            <div className="flex items-center gap-3 p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
              <img
                src={capturedSnapshot}
                alt="Captured profile"
                className="w-10 h-10 rounded-full object-cover border border-amber-400"
              />
              <div className="text-xs text-emerald-400 font-semibold">
                Photo captured! Applied to your profile.
              </div>
            </div>
          )}
        </div>

        {/* 3. MOBILE BROWSER PERMISSION INSTRUCTIONS */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            <HelpCircle className="w-4 h-4 text-orange-400" />
            <span>How to unblock permissions on Android & iOS:</span>
          </div>

          <ul className="space-y-1.5 text-[11px] text-zinc-400 pl-1 leading-relaxed">
            <li>
              <strong className="text-zinc-200">Android Chrome / Samsung: </strong>
              Tap the <strong className="text-zinc-200">Tune / Lock icon</strong> next to the URL address &rarr;{' '}
              <strong className="text-zinc-200">Permissions</strong> &rarr; Toggle Microphone & Camera to{' '}
              <strong className="text-emerald-400">Allow</strong>.
            </li>
            <li>
              <strong className="text-zinc-200">iPhone Safari: </strong>
              Tap <strong className="text-zinc-200">'aA'</strong> in the address bar &rarr;{' '}
              <strong className="text-zinc-200">Website Settings</strong> &rarr; Set Camera & Microphone to{' '}
              <strong className="text-emerald-400">Allow</strong>.
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
