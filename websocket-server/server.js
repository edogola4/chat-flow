// websocket-server/server.js
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

// Create Express app for file uploads
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Configure file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype
  });
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients and their room info
const clients = new Map(); // Map<WebSocket, {userId: string, username: string, room: string, status: string, lastSeen: Date}>
const rooms = new Map();   // Map<roomId, {name: string, description: string, type: string, members: Set<string>, createdAt: Date}>
const messages = new Map(); // Map<roomId, Array<message>>
const users = new Map();    // Map<userId, {username: string, email: string, avatar: string, status: string, lastSeen: Date}>

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

console.log('WebSocket server started on ws://localhost:3001');

// Helper function to get user info
function getUserInfo(userId) {
  return users.get(userId) || { username: 'Unknown', status: 'offline' };
}

// Helper function to get room info
function getRoomInfo(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  return {
    id: roomId,
    name: room.name,
    description: room.description,
    type: room.type,
    memberCount: room.members.size,
    createdAt: room.createdAt
  };
}

// Authentication handler
async function handleAuthenticate(ws, data, respond) {
  const { userId, username, email, avatar } = data;
  
  if (!userId || !username) {
    throw new Error('User ID and username are required');
  }
  
  // Create or update user
  const user = {
    userId,
    username,
    email: email || `${username}@example.com`,
    avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`,
    status: 'online',
    lastSeen: new Date()
  };
  
  users.set(userId, user);
  
  // Store client info
  clients.set(ws, { userId, username, status: 'online', lastSeen: new Date() });
  
  respond({
    type: 'AUTH_SUCCESS',
    data: {
      user: {
        id: userId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status
      },
      rooms: Array.from(rooms.entries()).map(([id, room]) => ({
        id,
        name: room.name,
        description: room.description,
        type: room.type,
        memberCount: room.members.size
      }))
    }
  });
}

// Room management
async function createRoom(roomData) {
  const roomId = uuidv4();
  const room = {
    ...roomData,
    id: roomId,
    members: new Set(),
    createdAt: new Date(),
    messages: []
  };
  
  rooms.set(roomId, room);
  messages.set(roomId, []);
  
  return {
    ...room,
    messages: [],
    memberCount: 0
  };
}

async function handleJoinRoom(ws, data, respond) {
  const { roomId, userId } = data;
  const clientData = clients.get(ws);
  
  if (!clientData) {
    throw new Error('Not authenticated');
  }
  
  // Leave current room if any
  if (clientData.roomId) {
    await handleLeaveRoom(ws, { roomId: clientData.roomId, userId }, () => {});
  }
  
  // Get or create room
  let room = rooms.get(roomId);
  if (!room) {
    room = await createRoom({
      name: `Room ${roomId.slice(0, 8)}`,
      description: 'A new chat room',
      type: 'public',
      createdBy: userId
    });
  }
  
  // Add user to room
  room.members.add(userId);
  clientData.roomId = roomId;
  
  // Send room info and history
  const roomMessages = messages.get(roomId) || [];
  const roomUsers = Array.from(clients.entries())
    .filter(([_, data]) => data.roomId === roomId)
    .map(([_, data]) => ({
      id: data.userId,
      username: data.username,
      status: data.status || 'online'
    }));
  
  respond({
    type: 'ROOM_JOINED',
    data: {
      room: getRoomInfo(roomId),
      messages: roomMessages.slice(-100), // Last 100 messages
      users: roomUsers
    }
  });
  
  // Notify others in the room
  broadcastToRoom(roomId, ws, {
    type: 'USER_JOINED',
    data: {
      userId: clientData.userId,
      username: clientData.username,
      timestamp: new Date().toISOString()
    }
  });
}

async function handleLeaveRoom(ws, data, respond) {
  const { roomId, userId } = data;
  const clientData = clients.get(ws);
  
  if (!clientData || !clientData.roomId) return;
  
  const room = rooms.get(roomId);
  if (room) {
    room.members.delete(userId);
    
    // Notify others in the room
    broadcastToRoom(roomId, ws, {
      type: 'USER_LEFT',
      data: {
        userId: clientData.userId,
        username: clientData.username,
        timestamp: new Date().toISOString()
      }
    });
    
    // Clean up empty rooms
    if (room.members.size === 0) {
      rooms.delete(roomId);
      messages.delete(roomId);
    }
  }
  
  // Update client data
  delete clientData.roomId;
  
  if (respond) {
    respond({
      type: 'ROOM_LEFT',
      data: { roomId, userId }
    });
  }
}

// Message handling
async function handleChatMessage(ws, data, respond) {
  const { roomId, content, type = 'text', metadata = {} } = data;
  const clientData = clients.get(ws);
  
  if (!clientData || !clientData.roomId) {
    throw new Error('Not in a room');
  }
  
  const message = {
    id: uuidv4(),
    roomId,
    senderId: clientData.userId,
    senderName: clientData.username,
    content,
    type,
    metadata,
    timestamp: new Date().toISOString(),
    reactions: []
  };
  
  // Store message
  if (!messages.has(roomId)) {
    messages.set(roomId, []);
  }
  messages.get(roomId).push(message);
  
  // Update room's last message
  const room = rooms.get(roomId);
  if (room) {
    room.lastMessage = message;
  }
  
  // Broadcast to room
  broadcastToRoom(roomId, ws, {
    type: 'NEW_MESSAGE',
    data: message
  });
  
  respond({
    type: 'MESSAGE_SENT',
    data: { messageId: message.id }
  });
}

// File upload handling
async function handleFileUpload(ws, data, respond) {
  const { roomId, fileName, fileType, fileSize, fileData } = data;
  const clientData = clients.get(ws);
  
  if (!clientData || !clientData.roomId) {
    throw new Error('Not in a room');
  }
  
  // In a real app, you'd save the file to disk or cloud storage
  const fileId = uuidv4();
  const filePath = path.join(UPLOAD_DIR, fileId);
  
  // Save file (in a real app, you'd handle this properly with streams)
  fs.writeFileSync(filePath, Buffer.from(fileData, 'base64'));
  
  // Create a message with file metadata
  const message = {
    id: uuidv4(),
    roomId,
    senderId: clientData.userId,
    senderName: clientData.username,
    content: fileName,
    type: 'file',
    metadata: {
      fileId,
      fileName,
      fileType,
      fileSize,
      url: `/uploads/${fileId}`
    },
    timestamp: new Date().toISOString(),
    reactions: []
  };
  
  // Store and broadcast message
  if (!messages.has(roomId)) {
    messages.set(roomId, []);
  }
  messages.get(roomId).push(message);
  
  // Broadcast to room
  broadcastToRoom(roomId, ws, {
    type: 'NEW_MESSAGE',
    data: message
  });
  
  respond({
    type: 'FILE_UPLOADED',
    data: {
      messageId: message.id,
      fileId,
      url: message.metadata.url
    }
  });
}

// Search messages
async function handleSearchMessages(ws, data, respond) {
  const { roomId, query } = data;
  const roomMessages = messages.get(roomId) || [];
  
  const results = roomMessages.filter(msg => 
    msg.content.toLowerCase().includes(query.toLowerCase())
  );
  
  respond({
    type: 'SEARCH_RESULTS',
    data: {
      query,
      results,
      total: results.length
    }
  });
}

// Get room history
async function handleGetRoomHistory(ws, data, respond) {
  const { roomId, before = new Date().toISOString(), limit = 50 } = data;
  let roomMessages = messages.get(roomId) || [];
  
  // Filter messages before the given timestamp
  roomMessages = roomMessages.filter(msg => 
    new Date(msg.timestamp) < new Date(before)
  );
  
  // Get the most recent messages up to the limit
  const paginatedMessages = roomMessages
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
  
  respond({
    type: 'MESSAGE_HISTORY',
    data: {
      roomId,
      messages: paginatedMessages,
      hasMore: roomMessages.length > limit
    }
  });
}

// Update user profile
async function handleUpdateProfile(ws, data, respond) {
  const { userId, updates } = data;
  const clientData = clients.get(ws);
  
  if (!clientData || clientData.userId !== userId) {
    throw new Error('Unauthorized');
  }
  
  // Update user data
  const user = users.get(userId) || {};
  users.set(userId, { ...user, ...updates, lastSeen: new Date() });
  
  // Update client data
  Object.assign(clientData, updates);
  
  // Notify room members if online status changed
  if (updates.status && clientData.roomId) {
    broadcastToRoom(clientData.roomId, ws, {
      type: 'USER_STATUS_CHANGED',
      data: {
        userId,
        status: updates.status,
        lastSeen: new Date().toISOString()
      }
    });
  }
  
  respond({
    type: 'PROFILE_UPDATED',
    data: {
      userId,
      updates
    }
  });
}

// Handle new connections
wss.on('connection', function connection(ws) {
  console.log('New client connected');
  
  // Set up ping/pong for connection health
  let isAlive = true;
  const pingInterval = setInterval(() => {
    if (!isAlive) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }
    isAlive = false;
    ws.ping();
  }, 30000);

  ws.on('pong', () => {
    isAlive = true;
  });
  
  // Handle incoming messages
  ws.on('message', async function incoming(message) {
    try {
      const { type, data, requestId } = JSON.parse(message);
      console.log('Received:', type, data);
      
      const respond = (response) => {
        ws.send(JSON.stringify({
          ...response,
          requestId,
          timestamp: new Date().toISOString()
        }));
      };
      
      try {
        switch (type) {
          case 'AUTHENTICATE':
            await handleAuthenticate(ws, data, respond);
            break;
            
          case 'JOIN_ROOM':
            await handleJoinRoom(ws, data, respond);
            break;
            
          case 'LEAVE_ROOM':
            await handleLeaveRoom(ws, data, respond);
            break;
            
          case 'SEND_MESSAGE':
            await handleChatMessage(ws, data, respond);
            break;
            
          case 'TYPING_STATUS':
            await handleTypingIndicator(ws, data, respond);
            break;
            
          case 'UPLOAD_FILE':
            await handleFileUpload(ws, data, respond);
            break;
            
          case 'SEARCH_MESSAGES':
            await handleSearchMessages(ws, data, respond);
            break;
            
          case 'GET_ROOM_HISTORY':
            await handleGetRoomHistory(ws, data, respond);
            break;
            
          case 'UPDATE_PROFILE':
            await handleUpdateProfile(ws, data, respond);
            break;
            
          case 'PING':
            respond({ type: 'PONG', data: { timestamp: new Date().toISOString() } });
            break;
            
          default:
            respond({ type: 'ERROR', error: 'Unknown message type' });
        }
      } catch (error) {
        console.error(`Error handling ${type}:`, error);
        respond({
          type: 'ERROR',
          error: error.message || 'An error occurred',
          requestId
        });
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    const clientData = clients.get(ws);
    if (clientData) {
      console.log(`Client ${clientData.username} disconnected`);
      handleLeaveRoom(ws, { roomId: clientData.room, username: clientData.username });
      clients.delete(ws);
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleJoinRoom(ws, { roomId, username }) {
  // Remove client from previous room if any
  const clientData = clients.get(ws);
  if (clientData && clientData.room) {
    const oldRoom = rooms.get(clientData.room);
    if (oldRoom) {
      oldRoom.delete(ws);
      if (oldRoom.size === 0) {
        rooms.delete(clientData.room);
      } else {
        // Notify others in the old room
        broadcastToRoom(clientData.room, ws, {
          type: 'USER_LEFT',
          data: { username: clientData.username, roomId: clientData.room }
        });
      }
    }
  }
  
  // Add client to new room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);
  
  // Update client data
  clients.set(ws, { username, room: roomId });
  
  // Notify client of successful join
  ws.send(JSON.stringify({
    type: 'JOINED_ROOM',
    data: { roomId, username, success: true }
  }));
  
  // Notify others in the room
  broadcastToRoom(roomId, ws, {
    type: 'USER_JOINED',
    data: { username, roomId }
  });
  
  console.log(`${username} joined room ${roomId}`);
}

function handleChatMessage(ws, payload) {
  // Get client data
  const clientData = clients.get(ws);
  if (!clientData) {
    console.log('Client not authenticated');
    return;
  }

  // Extract message data with proper error handling
  const { roomId, message, username } = payload || {};
  
  if (!roomId || !message || !username) {
    console.error('Invalid message format:', { roomId, message, username });
    return;
  }
  
  if (clientData.room !== roomId) {
    console.log(`Client not in room ${roomId}`);
    return;
  }
  
  console.log('Received chat message from', username, 'in room', roomId, ':', message);
  
  // Create the message object to broadcast
  const chatMessage = {
    type: 'NEW_MESSAGE',
    data: {
      id: Date.now().toString(),
      content: message,
      senderId: clientData.username, // Using username as ID for simplicity
      senderName: username,
      roomId: roomId,
      timestamp: new Date().toISOString(),
      type: 'text',
      reactions: [],
      attachments: []
    }
  };
  
  console.log('Broadcasting message:', JSON.stringify(chatMessage, null, 2));
  
  // Broadcast to all in the room including sender
  broadcastToRoom(roomId, null, chatMessage);
}

function handleTypingIndicator(ws, { roomId, username, isTyping }) {
  const clientData = clients.get(ws);
  if (!clientData || clientData.room !== roomId) return;
  
  broadcastToRoom(roomId, ws, {
    type: 'TYPING_INDICATOR',
    data: { username, isTyping, roomId }
  });
}

function handleLeaveRoom(ws, { roomId, username }) {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      rooms.delete(roomId);
    } else {
      // Notify others in the room
      broadcastToRoom(roomId, ws, {
        type: 'USER_LEFT',
        data: { username, roomId }
      });
    }
  }
  
  // If this was the last room for the client, remove them
  if (clients.get(ws)?.room === roomId) {
    clients.delete(ws);
  }
  
  console.log(`${username} left room ${roomId}`);
}

function broadcastToRoom(roomId, excludeWs, message) {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`Room ${roomId} not found`);
    return;
  }
  
  console.log(`Broadcasting to room ${roomId}:`, message);
  
  // Create a clean message object with default values
  const cleanMessage = {
    type: message.type,
    data: {
      // Set default values first
      content: message.data.message || '',  // Support both content and message fields
      sender: message.data.username || 'Unknown',
      roomId: roomId,
      timestamp: new Date().toISOString(),
      // Then spread the original data to override defaults
      ...message.data
    }
  };
  
  const messageStr = JSON.stringify(cleanMessage);
  
  let sentCount = 0;
  room.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
      sentCount++;
    }
  });
  
  console.log(`Message sent to ${sentCount} clients in room ${roomId}`);
  console.log('Message content:', cleanMessage.data.content || cleanMessage.data.message || 'No content');
}

// Broadcast a message to all clients in a room except the sender
function broadcastToRoom(roomId, excludeWs, message) {
  const room = rooms.get(roomId);
  if (!room) return;

  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  let recipientCount = 0;

  clients.forEach((clientData, client) => {
    if (client !== excludeWs && 
        client.readyState === WebSocket.OPEN && 
        clientData.roomId === roomId) {
      client.send(messageStr);
      recipientCount++;
    }
  });

  console.log(`Broadcasted to ${recipientCount} clients in room ${roomId}`);
  return recipientCount;
}

// Helper function to send a message to a specific client
function sendToClient(ws, type, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  
  // Notify all clients
  clients.forEach((_, client) => {
    if (client.readyState === WebSocket.OPEN) {
      sendToClient(client, 'SERVER_SHUTDOWN', { 
        message: 'Server is shutting down',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});