'use client';
import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';

/**
 * Minimal client UI for starting a session, capturing mic or tab audio,
 * chunking it and sending to Socket server.
 *
 * This is a scaffold — production needs permissions handling, error states,
 * and auth integration.
 */

const SOCKET_SERVER = process.env.NEXT_PUBLIC_SOCKET_SERVER || 'http://localhost:4000';

export default function HomePage() {
  const [status, setStatus] = useState('idle');
  const socketRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER);
    socketRef.current.on('status', (s: any) => setStatus(s.state));
    socketRef.current.on('partial-transcript', (p: any) => console.log('partial', p));
    socketRef.current.on('completed', (data: any) => {
      setStatus('completed');
      console.log('completed', data);
    });

    return () => {
      try {
        socketRef.current?.disconnect();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const getSupportedMimeType = () => {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/wav'
    ];
    const supported = mimeTypes.find((t) => {
      // Some environments may not support MediaRecorder.isTypeSupported
      try {
        return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t);
      } catch {
        return false;
      }
    });
    return supported || null;
  };

  const startSession = async (useTab = false) => {
    sessionIdRef.current = 'sess-' + Date.now();
    const socket = socketRef.current;
    const constraints = { audio: true };

    try {
      // request stream (tab or mic)
      const stream = useTab
        ? await (navigator.mediaDevices as any).getDisplayMedia({ audio: true })
        : await navigator.mediaDevices.getUserMedia(constraints);

      // keep a reference so we can stop tracks later
      streamRef.current = stream;

      // Determine best mimeType supported by the browser
      const supportedMime = getSupportedMimeType();
      console.log('Supported mime detected:', supportedMime);

      // Create MediaRecorder with fallback to undefined (let browser choose)
      let recorder: MediaRecorder;
      try {
        recorder = supportedMime ? new MediaRecorder(stream, { mimeType: supportedMime }) : new MediaRecorder(stream);
      } catch (err) {
        console.error('Failed to create MediaRecorder with mime:', supportedMime, err);
        // try with no options as last resort
        try {
          recorder = new MediaRecorder(stream);
        } catch (err2) {
          console.error('MediaRecorder unsupported on this browser/profile:', err2);
          setStatus('error');
          // stop tracks we just opened
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          return;
        }
      }

      mediaRecorderRef.current = recorder;

      // start a session at server
      socket.emit('start-session', { sessionId: sessionIdRef.current, metadata: { useTab } });

      recorder.ondataavailable = (e: BlobEvent) => {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            // base64 payload
            const base64 = (reader.result as string).split(',')[1];
            socket.emit('audio-chunk', { sessionId: sessionIdRef.current, chunk: base64, seq: Date.now() });
            console.log('sent chunk seq', Date.now());
          };
          reader.readAsDataURL(e.data);
        } catch (err) {
          console.error('ondataavailable error', err);
        }
      };

      recorder.onstart = () => {
        console.log('MediaRecorder started', recorder.state);
      };
      recorder.onpause = () => console.log('MediaRecorder paused', recorder.state);
      recorder.onresume = () => console.log('MediaRecorder resumed', recorder.state);
      recorder.onstop = () => console.log('MediaRecorder stopped', recorder.state);

      // slice/chunk interval. If browser forbids this interval, MediaRecorder may use default behavior.
      try {
        recorder.start(30000); // 30s chunks
      } catch (err) {
        // some browsers throw when passing timeslice; try without timeslice
        console.warn('start(timeslice) failed, trying start() without timeslice', err);
        recorder.start();
      }

      setStatus('recording');
    } catch (err: any) {
      console.error('startSession error:', err);
      setStatus('error');
    }
  };

  const stopSession = () => {
    const socket = socketRef.current;
    try {
      mediaRecorderRef.current?.stop();
    } catch (err) {
      console.warn('stop() on MediaRecorder threw', err);
    }
    // stop all tracks so browser releases mic/tab
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    socket.emit('stop-session', { sessionId: sessionIdRef.current });
    setStatus('processing');
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">ScribeAI — Scaffold</h1>
      <p>Status: <strong>{status}</strong></p>
      <div className="mt-4 space-x-2">
        <button onClick={() => startSession(false)} className="px-4 py-2 bg-blue-600 text-white rounded">Start Mic</button>
        <button onClick={() => startSession(true)} className="px-4 py-2 bg-green-600 text-white rounded">Start Tab</button>
        <button onClick={stopSession} className="px-4 py-2 bg-red-600 text-white rounded">Stop</button>
      </div>
    </main>
  );
}
