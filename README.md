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
- **Secure Authentication**: JWT-based authentication with token refresh
- **User Profiles**: Customizable user profiles with avatars and status
- **Multiple Chat Rooms**: Create and join different chat rooms
- **Online Status**: Real-time user presence and status updates
- **Message History**: View and search through chat history
- **File Sharing**: Share files within conversations
- **Themes**: Switch between light and dark mode
- **Responsive Design**: Works on desktop and mobile devices

## 🔐 Authentication System

ChatFlow implements a secure authentication system with the following features:

### Core Features
- **JWT Authentication**: Secure token-based authentication
- **Token Refresh**: Automatic token refresh before expiration
- **Protected Routes**: Route guards to secure application routes
- **User Sessions**: Persistent login sessions with token storage
- **Role-Based Access**: Different permission levels for users and admins

### User Management
- **Registration**: Create new accounts with email verification
- **Login/Logout**: Secure authentication flow
- **Profile Management**: Update user information and preferences
- **Password Reset**: Self-service password reset functionality

## 🌟 WebSocket Integration

### Authentication Flow
1. User logs in and receives a JWT token
2. WebSocket connection is established with the token
3. Server validates the token and authenticates the WebSocket connection
4. User can send/receive real-time messages

### WebSocket Service
- **Secure Connection**: JWT authentication for WebSocket connections
- **Automatic Reconnection**: Handles connection drops gracefully
- **Message Queue**: Queues messages when offline and sends when reconnected
- **Type-Safe**: Strongly typed messages with TypeScript interfaces
- **Connection Monitoring**: Tracks connection status and health

### Server-Side Implementation
- **Port**: 3001 (configurable via environment variables)
- **Features**:
  - Handles multiple concurrent connections
  - Broadcasts messages to specific rooms or all clients
  - Maintains user presence and status
  - Validates JWT tokens for authenticated connections
  - Implements ping/pong for connection health checking

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

3. **Set up environment variables**
   Create a `.env` file in the root directory with:
   ```
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=1d
   JWT_REFRESH_SECRET=your_refresh_token_secret
   JWT_REFRESH_EXPIRES_IN=7d
   
   # WebSocket Configuration
   WS_PORT=3001
   ```

4. **Start the servers**
   ```bash
   # Start WebSocket server (in a new terminal)
   cd websocket-server
   npm start
   
   # Start Angular development server (in a new terminal)
   ng serve
   ```

5. **Open the application**
   ```
   http://localhost:4200
   ```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

### User Profile
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `PUT /api/users/:id/password` - Change password

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
