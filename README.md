# ChatFlow

[![Vercel](https://vercelbadge.vercel.app/api/edogola4/chat-flow)](https://chat-flow.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/edogola4/chat-flow)](https://github.com/edogola4/chat-flow/commits/main)
[![GitHub Issues](https://img.shields.io/github/issues/edogola4/chat-flow)](https://github.com/edogola4/chat-flow/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/edogola4/chat-flow)](https://github.com/edogola4/chat-flow/pulls)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/edogola4/chat-flow/graphs/commit-activity)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

A modern, real-time chat application built with Angular and WebSockets, featuring end-to-end encrypted messaging, multiple chat rooms, and a responsive design with dark/light theme support.

![ChatFlow Logo](https://via.placeholder.com/150)  <!-- Replace with actual logo -->

## ✨ Features

- **Real-time Messaging**: Instant message delivery using WebSockets
- **WebSocket Test Component**: Test WebSocket connections and messages
- **User Authentication**: Secure login and registration system
- **Multiple Chat Rooms**: Create and join different chat rooms
- **Online Status**: See who's online in real-time
- **Message History**: View and search through chat history
- **File Sharing**: Share files within conversations
- **Themes**: Switch between light and dark mode
- **Responsive Design**: Works on desktop and mobile devices

## 🌟 WebSocket Implementation

ChatFlow uses WebSockets for real-time communication between clients and the server. The implementation includes:

### WebSocket Service
- Connection management with automatic reconnection
- Message queuing when offline
- Type-safe message handling
- Connection status monitoring

### Server-Side (WebSocket Server)
- Node.js WebSocket server running on port 3001
- Handles multiple client connections
- Broadcasts messages to all connected clients
- Supports ping/pong for connection health checking

### Key Features
- **Real-time Messaging**: Instant message delivery between clients
- **Connection Management**: Automatic reconnection on disconnect
- **Message Broadcasting**: Send messages to all connected clients
- **Type Safety**: Strongly typed messages with TypeScript
- **Error Handling**: Comprehensive error handling and logging

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or later)
- npm (v9 or later)
- Angular CLI (v19 or later)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/edogola4/chat-flow.git
   cd chat-flow
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install WebSocket server dependencies
   cd websocket-server
   npm install
   cd ..
   ```

3. **Start the servers**
   ```bash
   # Start WebSocket server (in a new terminal)
   cd websocket-server
   npm start
   
   # Start Angular development server (in a new terminal)
   ng serve
   ```

4. **Open the application**
   ```
   http://localhost:4200
   ```

## 🧪 Testing WebSocket Connection

1. Navigate to `http://localhost:4200/websocket-test`
2. The test interface will show:
   - Connection status
   - Message log
   - Controls to send test messages
   - Connection statistics

### Test Client
A test client is included in `websocket-server/test-client.js` for testing the WebSocket server directly:

```bash
# In the websocket-server directory
node test-client.js
```

## 📁 Project Structure

```
chat-flow/
├── src/                         # Angular application
│   ├── app/
│   │   ├── core/
│   │   │   └── services/
│   │   │       └── websocket.service.ts  # WebSocket service
│   │   └── features/
│   │       ├── websocket-test/          # WebSocket test component
│   │       └── chat/                    # Chat components
│   └── shared/
│       └── models/
│           └── websocket-message.model.ts  # Message types
└── websocket-server/             # WebSocket server
    ├── server.js                 # WebSocket server implementation
    ├── test-client.js            # Test client
    └── package.json              # Server dependencies
```

## 📚 Documentation

### WebSocket Message Types

```typescript
interface WebSocketMessage<T = any> {
  type: WebSocketMessageType | string;
  payload: T;
  timestamp: string;
  requestId?: string;
}

enum WebSocketMessageType {
  // Authentication
  AUTHENTICATE = 'AUTHENTICATE',
  AUTHENTICATED = 'AUTHENTICATED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Connection
  CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED',
  PING = 'PING',
  PONG = 'PONG',
  
  // Messages
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_UPDATED = 'MESSAGE_UPDATED',
  MESSAGE_DELETED = 'MESSAGE_DELETED',
  MESSAGE_BROADCAST = 'MESSAGE_BROADCAST',
  
  // Typing indicators
  TYPING_START = 'TYPING_START',
  TYPING_END = 'TYPING_END',
  
  // Room events
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',
  
  // Error
  ERROR = 'ERROR'
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Angular](https://angular.io/)
- Real-time functionality powered by [Socket.IO](https://socket.io/)
- Icons from [Material Icons](https://material.io/resources/icons/)
- Styled with [Angular Material](https://material.angular.io/)

---

<div align="center">
  Made with ❤️ by Your Name
</div>
