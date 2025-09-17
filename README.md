# ChatFlow

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/edogola4/chat-flow)](https://github.com/edogola4/chat-flow/commits/main)
[![GitHub Issues](https://img.shields.io/github/issues/edogola4/chat-flow)](https://github.com/edogola4/chat-flow/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/edogola4/chat-flow)](https://github.com/edogola4/chat-flow/pulls)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/edogola4/chat-flow/graphs/commit-activity)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Angular](https://img.shields.io/badge/Angular-v19+-DD0031?style=flat&logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7+-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Angular Material](https://img.shields.io/badge/Angular_Material-v19-FF4081?style=flat&logo=angular&logoColor=white)](https://material.angular.io/)

A modern, real-time chat application built with Angular 19, TypeScript, and WebSockets, featuring a responsive design with dark/light theme support and secure user authentication.

## ✨ Features

### Core Features
- **Real-time Messaging**: Instant message delivery using WebSockets
- **User Authentication**: JWT-based authentication system with token management
- **User Profiles**: View and manage user profiles with avatars and status indicators
- **Theme System**: Toggle between light and dark themes with system preference detection
- **Responsive Design**: Fully responsive layout that works on all device sizes

### Technical Highlights
- **Modern Angular**: Built with Angular 19 using standalone components
- **Reactive State Management**: Leveraging RxJS for efficient state management
- **Type Safety**: Full TypeScript support with strict typing
- **Material Design**: Clean and modern UI components from Angular Material
- **WebSocket Integration**: Real-time communication with WebSocket server

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or later
- npm 9 or later (included with Node.js)
- Angular CLI 19 or later

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/edogola4/chat-flow.git
   cd chat-flow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   ng serve
   ```

4. **Open in browser**
   ```
   http://localhost:4200/
   ```

## 🛠 Project Structure

```
src/
├── app/
│   ├── core/               # Core functionality (auth, interceptors, services)
│   ├── features/           # Feature modules
│   │   ├── profile/        # User profile management
│   │   └── settings/       # Application settings
│   ├── shared/             # Shared components, directives, and pipes
│   ├── app.component.ts    # Root component
│   └── app.routes.ts       # Application routes
├── assets/                # Static assets (images, fonts, etc.)
└── styles/                # Global styles and theme variables
```

## 🔐 Authentication System

ChatFlow implements a secure authentication system with the following features:

### Core Authentication
- **JWT Authentication**: Secure token-based authentication
- **Token Management**: Automatic token refresh and storage
- **Protected Routes**: Route guards to secure application routes
- **User Sessions**: Persistent login sessions with local storage

### User Management
- **Login/Logout**: Secure authentication flow
- **Profile Management**: View and update user information
- **Status Updates**: Set and update user status (online/away/busy/offline)

## 🌐 WebSocket Integration

ChatFlow uses WebSockets for real-time communication with the following features:

### Key Features
- **Real-time Updates**: Instant message delivery and status updates
- **Connection Management**: Automatic reconnection and error handling
- **Message Queue**: Offline message queuing with delivery status
- **Event-based Architecture**: Clean separation of concerns with typed events

### WebSocket Events
- `CHAT_MESSAGE`: Send/receive chat messages
- `JOIN_ROOM`: Join a chat room
- `LEAVE_ROOM`: Leave a chat room
- `NEW_MESSAGE`: Broadcast new messages to room participants

## 🎨 Theming System

ChatFlow includes a flexible theming system with the following features:
- Light and dark theme support
- System preference detection
- Custom theme creation
- Dynamic theme switching at runtime

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Commit your changes with clear commit messages
4. Push to your fork and submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Angular](https://angular.io/) - The web framework used
- [Angular Material](https://material.angular.io/) - UI component library
- [RxJS](https://rxjs.dev/) - Reactive programming library
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) - Real-time communication
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

## 🎨 Theme Support

ChatFlow includes a built-in theme system with the following features:

### Theme Features
- **Light/Dark Mode**: Toggle between light and dark themes
- **System Preference**: Automatically detects and applies the system theme
- **Persistent**: Theme preference is saved in local storage
- **Smooth Transitions**: Animated theme transitions for a better user experience
- **Themed Components**: All UI components adapt to the selected theme

### How to Use
1. Click the theme toggle button in the header or navigate to Settings
2. Toggle the "Dark Mode" switch to change themes
3. The theme will be saved and persist across page refreshes
4. The app will automatically detect and match your system theme preference

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or later)
- npm (v9 or later)
- Angular CLI (v19 or later)
- Angular Material (v19 or later)

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

## 🛠 Development

### Project Structure

```
chat-flow/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── theme.service.ts      # Theme management
│   │   │   │   └── websocket.service.ts  # WebSocket service
│   │   │   └── theme/                    # Theme components and styles
│   │   └── features/
│   │       ├── settings/                 # User settings including theme
│   │       └── chat/                     # Chat components
│   └── styles/
│       └── _themes.scss                  # Theme variables and styles
└── websocket-server/                     # WebSocket server
```

### Running Locally

1. Start the development server:
   ```bash
   ng serve
   ```

2. Start the WebSocket server:
   ```bash
   cd websocket-server
   npm start
   ```

3. Open your browser and navigate to `http://localhost:4200`

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Follow the [Angular Style Guide](https://angular.io/guide/styleguide)
- Use meaningful commit messages following [Conventional Commits](https://www.conventionalcommits.org/)
- Ensure all tests pass before submitting a PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Angular](https://angular.io/)
- Real-time functionality powered by [Socket.IO](https://socket.io/)
- Icons from [Material Icons](https://material.io/resources/icons/)
- Styled with [Angular Material](https://material.angular.io/)
- Theme system inspired by [Angular Material Theming](https://material.angular.io/guide/theming)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Made with ❤️ by the ChatFlow Team
</div>
