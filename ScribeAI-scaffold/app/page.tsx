
'use client';
import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';

/**
 * Minimal client UI for starting a session, capturing mic or tab audio,
 * chunking it and sending to Socket server.
 *
 * This is a scaffold — production needs permissions handling, error states,
 * and auth (Better Auth) integration.
 */

const SOCKET_SERVER = process.env.NEXT_PUBLIC_SOCKET_SERVER || 'http://localhost:4000';

export default function HomePage() {
  const [status, setStatus] = useState('idle');
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER);
    socketRef.current.on('status', (s) => setStatus(s.state));
    socketRef.current.on('partial-transcript', (p) => console.log('partial', p));
    socketRef.current.on('completed', (data) => {
      setStatus('completed');
      console.log('completed', data);
    });
    return () => { socketRef.current.disconnect(); };
  }, []);

  const startSession = async (useTab=false) => {
    sessionIdRef.current = 'sess-' + Date.now();
    const constraints = useTab ? { audio: true } : { audio: true };
    try {
      const stream = useTab ? await navigator.mediaDevices.getDisplayMedia({ audio: true }) : await navigator.mediaDevices.getUserMedia(constraints);
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const socket = socketRef.current;
      socket.emit('start-session', { sessionId: sessionIdRef.current, metadata: { useTab } });
      mediaRecorderRef.current.ondataavailable = (e) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          socket.emit('audio-chunk', { sessionId: sessionIdRef.current, chunk: base64, seq: Date.now() });
        };
        reader.readAsDataURL(e.data);
      };
      mediaRecorderRef.current.start(30000); // 30s chunking
      setStatus('recording');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const stopSession = () => {
    const socket = socketRef.current;
    mediaRecorderRef.current?.stop();
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
