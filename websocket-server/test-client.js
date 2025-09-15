const WebSocket = require('ws');

// WebSocket server URL
const WS_URL = 'ws://localhost:3001';

console.log('Connecting to WebSocket server at', WS_URL);

// Create WebSocket connection
const socket = new WebSocket(WS_URL);

// Connection opened
socket.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Send a test message
  const message = {
    type: 'PING',
    payload: { timestamp: new Date().toISOString() },
    requestId: Math.random().toString(36).substring(2, 15)
  };
  
  console.log('Sending message:', message);
  socket.send(JSON.stringify(message));
});

// Listen for messages
socket.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received message:', message);
  
  // Close the connection after receiving a response
  if (message.type === 'PONG') {
    console.log('Received PONG response, closing connection');
    socket.close();
  }
});

// Handle errors
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Handle connection close
socket.on('close', (code, reason) => {
  console.log(`WebSocket connection closed: ${code} - ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});
