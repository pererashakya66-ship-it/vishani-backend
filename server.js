require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const locationRoutes = require('./routes/location');
const communityRoutes = require('./routes/community');
const trackRoutes = require('./routes/track');
const { handleSocket, onlineUsers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

connectDB();

app.use(cors());
app.use(express.json());

// REST routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/community', communityRoutes(io, onlineUsers));
app.use('/track', trackRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Socket.io auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id.toString();
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => handleSocket(io, socket));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Women Safety server running on port ${PORT}`);
});
