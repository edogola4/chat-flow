# Chat Flow WebSocket Server

A robust, production-ready WebSocket server for real-time chat functionality with enhanced security, reliability, and performance features.

## Features

- 🔒 **Secure Authentication** - JWT-based authentication for WebSocket connections
- 🚀 **Real-time Messaging** - Instant message delivery with typing indicators
- 🏠 **Room Management** - Create, join, and leave chat rooms
- 📊 **Message History** - In-memory message history for each room
- ⚡ **Performance Optimized** - Efficient broadcasting and memory management
- 🛡️ **Rate Limiting** - Prevent abuse with configurable rate limits
- 🔄 **Auto-reconnection** - Client reconnection handling with backoff
- 📝 **Structured Logging** - Comprehensive logging with Winston
- 🧪 **Type Safety** - Full TypeScript support with strict typing

## Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Copy `.env.example` to `.env` and update with your configuration:
   ```bash
   cp .env.example .env
   ```

## Development

```bash
# Start development server with hot-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Linting & Formatting

```bash
# Run linter
npm run lint

# Format code
npm run format
```

## Environment Variables

See `.env.example` for all available configuration options.

## API Reference

### Authentication

```typescript
// Client -> Server
{
  "type": "AUTHENTICATE",
  "payload": {
    "token": "jwt_token_here",
    "username": "username"
  },
  "requestId": "unique_request_id"
}

// Server -> Client (Success)
{
  "type": "AUTH_SUCCESS",
  "payload": {
    "userId": "user_123",
    "username": "username",
    "status": "online"
  },
  "requestId": "unique_request_id"
}
```

### Joining a Room

```typescript
// Client -> Server
{
  "type": "JOIN_ROOM",
  "payload": {
    "roomId": "room_123"
  },
  "requestId": "unique_request_id"
}

// Server -> Client (Success)
{
  "type": "ROOM_JOINED",
  "payload": {
    "room": {
      "id": "room_123",
      "name": "General Chat",
      "description": "General discussion",
      "type": "public",
      "memberCount": 5,
      "createdAt": "2023-10-01T12:00:00.000Z"
    },
    "messages": [/* last 100 messages */],
    "users": [/* list of users in the room */]
  },
  "requestId": "unique_request_id"
}
```

### Sending a Message

```typescript
// Client -> Server
{
  "type": "SEND_MESSAGE",
  "payload": {
    "roomId": "room_123",
    "content": "Hello, world!",
    "type": "text"
  },
  "requestId": "unique_request_id"
}

// Server -> All clients in room
{
  "type": "NEW_MESSAGE",
  "payload": {
    "id": "msg_123",
    "roomId": "room_123",
    "userId": "user_123",
    "username": "username",
    "content": "Hello, world!",
    "type": "text",
    "timestamp": "2023-10-01T12:00:00.000Z"
  }
}
```

### Typing Indicator

```typescript
// Client -> Server
{
  "type": "TYPING_STATUS",
  "payload": {
    "roomId": "room_123",
    "isTyping": true
  }
}

// Server -> Other clients in room
{
  "type": "TYPING_UPDATE",
  "payload": {
    "roomId": "room_123",
    "userId": "user_123",
    "username": "username",
    "isTyping": true
  }
}
```

## Error Handling

All error responses follow this format:

```typescript
{
  "type": "ERROR",
  "payload": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "requestId": "unique_request_id" // If available
}
```

Common error codes:
- `UNAUTHORIZED`: Authentication required or invalid token
- `INVALID_MESSAGE`: Malformed message format
- `ROOM_NOT_FOUND`: The specified room does not exist
- `NOT_A_MEMBER`: User is not a member of the room
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_ERROR`: Internal server error

## Deployment

### Docker

```bash
# Build the Docker image
docker build -t chat-flow-ws .

# Run the container
docker run -p 3001:3001 --env-file .env chat-flow-ws
```

### PM2 (Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start the server in production mode
pm2 start dist/server.js --name "chat-flow-ws"

# Monitor logs
pm2 logs chat-flow-ws
```

## Monitoring

The server provides the following metrics:

- Active connections
- Room statistics
- Message throughput
- Error rates

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

---

Built with ❤️ by the Chat Flow Team
