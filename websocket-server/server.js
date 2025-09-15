// websocket-server/server.js
const WebSocket = require('ws');

// Create WebSocket server on port 3001 (using 3001 since 3000 might be in use)
const wss = new WebSocket.Server({ port: 3001 });

// Store connected clients
const clients = new Set();

console.log('WebSocket server started on ws://localhost:3001');
console.log('WebSocket server is ready to accept connections...');

// Handle new connections
wss.on('connection', function connection(ws) {
  console.log('New client connected');
  clients.add(ws);
  
  // Send a welcome message
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    payload: {
      message: 'Successfully connected to WebSocket server',
      timestamp: new Date().toISOString()
    }
  }));
  
  // Handle incoming messages
  ws.on('message', function incoming(message) {
    console.log('Received:', message.toString());
    
    try {
      const parsedMessage = JSON.parse(message);
      
      // Echo the message back to the client
      if (parsedMessage.type === 'PING') {
        ws.send(JSON.stringify({
          type: 'PONG',
          payload: { timestamp: new Date().toISOString() },
          requestId: parsedMessage.requestId
        }));
      }
      
      // Broadcast to all clients except the sender
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'MESSAGE_BROADCAST',
            payload: {
              message: 'This is a broadcast message',
              originalMessage: parsedMessage,
              timestamp: new Date().toISOString()
            }
          }));
        }
      });
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});