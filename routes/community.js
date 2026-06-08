const router = require('express').Router();
const auth = require('../middleware/auth');
const HelpRequest = require('../models/HelpRequest');
const FriendRequest = require('../models/FriendRequest');

// Resolve friend IDs for the current user
const getFriendIds = async (userId) => {
  const accepted = await FriendRequest.find({
    status: 'accepted',
    $or: [{ from: userId }, { to: userId }],
  });
  return accepted.map((r) =>
    r.from.toString() === userId.toString() ? r.to : r.from
  );
};

module.exports = (io, onlineUsers) => {
  // GET /api/community/feed  — help requests from friends + self (active, newest first)
  router.get('/feed', auth, async (req, res) => {
    try {
      const friendIds = await getFriendIds(req.user._id);
      const visibleUsers = [req.user._id, ...friendIds];

      const requests = await HelpRequest.find({
        user: { $in: visibleUsers },
        status: 'active',
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('user', 'name mobile');

      res.json({ requests });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/community/request  — post a help request (bound to current location)
  router.post('/request', auth, async (req, res) => {
    try {
      const { type, description, latitude, longitude, isAnonymous } = req.body;
      if (!description || latitude == null || longitude == null)
        return res
          .status(400)
          .json({ error: 'description, latitude and longitude are required' });

      const request = await HelpRequest.create({
        user: req.user._id,
        type: type || 'general',
        description,
        latitude,
        longitude,
        isAnonymous: !!isAnonymous,
      });

      const populated = await request.populate('user', 'name mobile');

      // Broadcast to all online friends
      const friendIds = await getFriendIds(req.user._id);
      for (const friendId of friendIds) {
        const socketId = onlineUsers.get(friendId.toString());
        if (socketId) {
          io.to(socketId).emit('new_help_request', populated);
        }
      }

      res.status(201).json({ request: populated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/community/request/:id/resolve
  router.put('/request/:id/resolve', auth, async (req, res) => {
    try {
      const request = await HelpRequest.findOne({
        _id: req.params.id,
        user: req.user._id,
      });
      if (!request) return res.status(404).json({ error: 'Request not found' });
      request.status = 'resolved';
      await request.save();
      res.json({ request });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
