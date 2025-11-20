
/**
 * Simple Socket.io server to accept audio chunk streams and forward to Gemini placeholder.
 * Run: node server/index.js
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const PORT = process.env.SOCKET_PORT || 4000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// In-memory session buffer example. Replace with durable store for production.
const sessions = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
  socket.on('start-session', (payload) => {
    const { sessionId, metadata } = payload || {};
    sessions.set(sessionId, { chunks: [], metadata });
    socket.join(sessionId);
    socket.emit('status', { state: 'recording' });
  });

  socket.on('audio-chunk', (data) => {
    // data: { sessionId, chunk (base64), seq }
    const s = sessions.get(data.sessionId);
    if (!s) return socket.emit('error', { message: 'session-not-found' });
    s.chunks.push({ seq: data.seq, chunk: data.chunk, ts: Date.now() });
    // For demo: emit partial 'transcript' as echo
    socket.to(data.sessionId).emit('partial-transcript', { seq: data.seq, text: '[partial transcript placeholder]' });
  });

  socket.on('stop-session', async ({ sessionId }) => {
    const s = sessions.get(sessionId);
    if (!s) return;
    // Aggregate chunks; here we'd call Gemini for final transcription + summary
    io.to(sessionId).emit('status', { state: 'processing' });
    // Simulate processing delay
    setTimeout(() => {
      io.to(sessionId).emit('completed', { sessionId, transcript: 'FULL TRANSCRIPT PLACEHOLDER', summary: 'SUMMARY PLACEHOLDER' });
      sessions.delete(sessionId);
    }, 1000);
  });

  socket.on('disconnect', () => console.log('Socket disconnected', socket.id));
});

server.listen(PORT, () => console.log('Socket server listening on', PORT));
