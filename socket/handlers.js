const FriendRequest = require('../models/FriendRequest');
const LocationRecord = require('../models/LocationRecord');

// userId → socket.id map for routing — exported so routes can broadcast
const onlineUsers = new Map();

const handleSocket = (io, socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  console.log(`User ${userId} connected`);

  // Notify friends this user is online
  socket.broadcast.emit('friend_status', { userId, online: true });

  // ── Location update (while tracking is active) ────────────────────────────
  socket.on('location_update', async (data) => {
    try {
      const { latitude, longitude, accuracy, speed, isEmergency } = data;
      if (latitude == null || longitude == null) return;

      await LocationRecord.create({
        user: userId,
        latitude,
        longitude,
        accuracy,
        speed,
        isEmergency: !!isEmergency,
      });

      const friends = await FriendRequest.find({
        status: 'accepted',
        $or: [{ from: userId }, { to: userId }],
      });

      for (const f of friends) {
        const friendId =
          f.from.toString() === userId ? f.to.toString() : f.from.toString();
        const friendSocket = onlineUsers.get(friendId);
        if (friendSocket) {
          io.to(friendSocket).emit('friend_location', {
            userId,
            latitude,
            longitude,
            accuracy,
            speed,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    socket.broadcast.emit('friend_status', { userId, online: false });
    console.log(`User ${userId} disconnected`);
  });
};

module.exports = { handleSocket, onlineUsers };
