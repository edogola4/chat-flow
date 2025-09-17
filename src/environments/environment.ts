export const environment = {
  production: false,
  wsUrl: 'ws://localhost:3001', // WebSocket server URL
  apiUrl: 'http://localhost:3000', // API base URL
  reconnectAttempts: 5,
  reconnectDelay: 3000,
  heartbeatInterval: 30000
};
