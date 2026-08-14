import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, ChevronRight } from 'lucide-react';
import { getApiUrl } from '../api';

export default function Permissions() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [allConsents, setAllConsents] = useState({
    understand: false,
    camera: false,
    microphone: false,
  });

  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
  });

  const [cameraRequested, setCameraRequested] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ensureSessionId = () => {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  const requestCameraPermission = () => {
    ensureSessionId();
    setCameraRequested(true);
  };

  const requestMicrophonePermission = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyser);

      analyserRef.current = analyser;
      setPermissions((prev) => ({ ...prev, microphone: true }));
      
      // Start audio level meter
      updateAudioLevel();
    } catch (error) {
      console.error('Microphone permission denied:', error);
      alert('Microphone permission was denied');
    }
  };

  const updateAudioLevel = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average);
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  const uploadPhotoToServer = async (photoData: string) => {
    const sessionId = ensureSessionId();

    try {
      const response = await fetch(getApiUrl('/api/media/photos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          photo_data: photoData,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Failed to upload captured photo:', response.status);
      }
    } catch (error) {
      console.error('Failed to upload captured photo:', error);
    }
  };

  const capturePhotoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL('image/png');
    sessionStorage.setItem('lastPhotoData', photoData);
    void uploadPhotoToServer(photoData);
  };

  const handleStartSession = async () => {
    if (!allConsents.understand || !allConsents.camera || !allConsents.microphone) {
      alert('Please grant all permissions to continue');
      return;
    }

    if (!permissions.camera || !permissions.microphone) {
      alert('Please enable camera and microphone');
      return;
    }

    const sessionId = ensureSessionId();

    try {
      const response = await fetch(getApiUrl('/api/sessions/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          consent: allConsents,
        }),
      });

      if (response.ok) {
        navigate('/demo/instagram');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      // Proceed anyway for offline mode
      navigate('/demo/instagram');
    }
  };

  useEffect(() => {
    ensureSessionId();
  }, []);

  useEffect(() => {
    if (!cameraRequested) {
      return;
    }

    let cancelled = false;
    let mediaStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => undefined);
        }

        setPermissions((prev) => ({ ...prev, camera: true }));

        if (photoIntervalRef.current) {
          clearInterval(photoIntervalRef.current);
        }
        photoIntervalRef.current = setInterval(capturePhotoFrame, 1000);
      } catch (error) {
        if (!cancelled) {
          console.error('Camera permission denied:', error);
          alert('Camera permission was denied');
          setCameraRequested(false);
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (photoIntervalRef.current) {
        clearInterval(photoIntervalRef.current);
        photoIntervalRef.current = null;
      }
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraRequested]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">
          Permissions & Setup
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Grant permissions to capture camera and audio for the demonstration
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Consent Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">✅ Consent</h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allConsents.understand}
                  onChange={(e) =>
                    setAllConsents((prev) => ({ ...prev, understand: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  I understand this is an educational demonstration
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allConsents.camera}
                  onChange={(e) =>
                    setAllConsents((prev) => ({ ...prev, camera: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  I consent to camera capture (1 photo per second)
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allConsents.microphone}
                  onChange={(e) =>
                    setAllConsents((prev) => ({ ...prev, microphone: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  I consent to microphone audio capture
                </span>
              </label>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📹 Permissions</h2>
            <div className="space-y-3">
              <button
                onClick={requestCameraPermission}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition ${
                  permissions.camera
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Camera size={20} />
                  <span>{permissions.camera ? '✓ Camera' : 'Request Camera'}</span>
                </div>
                {permissions.camera && <span className="text-green-600">✓</span>}
              </button>

              <button
                onClick={requestMicrophonePermission}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition ${
                  permissions.microphone
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mic size={20} />
                  <span>{permissions.microphone ? '✓ Microphone' : 'Request Microphone'}</span>
                </div>
                {permissions.microphone && <span className="text-green-600">✓</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Camera Preview */}
        {cameraRequested && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📷 Live Camera Preview</h2>
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full aspect-video object-cover"
              />
              <canvas
                ref={canvasRef}
                width="640"
                height="480"
                className="hidden"
              />
              <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                ● REC
              </div>
              <p className="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                📸 Capturing 1 photo/second
              </p>
            </div>
          </div>
        )}

        {/* Audio Level Meter */}
        {permissions.microphone && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🎤 Audio Level</h2>
            <div className="space-y-3">
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-full transition-all"
                  style={{ width: `${(audioLevel / 255) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                Current level: {Math.round((audioLevel / 255) * 100)}%
              </p>
            </div>
          </div>
        )}

        {/* Start Button */}
        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Go Back
          </button>
          <button
            onClick={handleStartSession}
            disabled={
              !allConsents.understand ||
              !allConsents.camera ||
              !allConsents.microphone ||
              !permissions.camera ||
              !permissions.microphone
            }
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Session
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ What happens next:</strong> You'll be shown social media login clones.
            When you "login," your credentials will be captured to demonstrate how quickly
            personal data can be accessed. This data will be shown to you and deleted immediately after.
          </p>
        </div>
      </div>
    </div>
  );
}
