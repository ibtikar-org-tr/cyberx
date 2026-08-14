import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../api';
import { isLiveMicActive, startLiveMic, stopLiveMic } from '../liveAudio';

export default function Permissions() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraRequested, setCameraRequested] = useState(false);
  const [micRequested, setMicRequested] = useState(isLiveMicActive());
  const [sessionClosed, setSessionClosed] = useState(false);
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ensureSessionId = () => {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  const stopCapture = () => {
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
    }
    setCameraRequested(false);
    setMicRequested(false);
    setSessionClosed(true);
    stopLiveMic();
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

      if (response.status === 409) {
        stopCapture();
        return;
      }

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

  useEffect(() => {
    ensureSessionId();
    if (!sessionClosed) {
      setCameraRequested(true);
      setMicRequested(true);
    }
  }, [sessionClosed]);

  useEffect(() => {
    if (sessionClosed) {
      return;
    }

    const pollSessionStatus = async () => {
      const sessionId = sessionStorage.getItem('sessionId');
      if (!sessionId) {
        return;
      }

      try {
        const response = await fetch(getApiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/status`));
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data?.status && data.status !== 'active') {
          stopCapture();
        }
      } catch (error) {
        console.error('Failed to check session status:', error);
      }
    };

    const interval = setInterval(() => {
      void pollSessionStatus();
    }, 3000);
    void pollSessionStatus();

    return () => clearInterval(interval);
  }, [sessionClosed]);

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
    if (!micRequested || sessionClosed) {
      return;
    }

    let cancelled = false;

    const startMicrophone = async () => {
      try {
        await startLiveMic(ensureSessionId(), {
          onLevel: () => undefined,
          onListening: () => undefined,
        });
        if (!cancelled) {
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Microphone permission denied:', error);
          alert('Microphone permission was denied');
          setMicRequested(false);
        }
      }
    };

    void startMicrophone();

    return () => {
      cancelled = true;
    };
  }, [micRequested, sessionClosed]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">
            Permissions & Setup
          </h1>

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="hidden"
          />
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            className="hidden"
          />

          <div className="space-y-5 text-gray-700">
            <p className="text-lg leading-relaxed">
              This demo will capture camera and microphone access to show how user data can be collected in a realistic phishing scenario.
            </p>
            <p className="text-lg leading-relaxed">
              The browser will ask for permission automatically when this page opens. Once access is granted, the activity will be recorded for the admin dashboard.
            </p>
            <p className="text-lg leading-relaxed">
              After setup is complete, you will continue to the social media login simulation, where the demo explains how credentials and personal data can be exposed.
            </p>
          </div>

          {sessionClosed && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              This session was closed by an administrator. Camera capture and live audio have been stopped.
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-blue-700 hover:text-blue-900 underline underline-offset-4 font-medium"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
