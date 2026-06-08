const router = require('express').Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const FriendRequest = require('../models/FriendRequest');

const areFriends = async (userA, userB) => {
  const r = await FriendRequest.findOne({
    status: 'accepted',
    $or: [
      { from: userA, to: userB },
      { from: userB, to: userA },
    ],
  });
  return !!r;
};

// GET /api/messages/:friendId  — conversation (newest last)
router.get('/:friendId', auth, async (req, res) => {
  try {
    const me = req.user._id;
    const friendId = req.params.friendId;

    if (!(await areFriends(me, friendId)))
      return res.status(403).json({ error: 'Not friends' });

    const messages = await Message.find({
      $or: [
        { sender: me, recipient: friendId },
        { sender: friendId, recipient: me },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100);

    // Mark unread messages as read
    await Message.updateMany(
      { sender: friendId, recipient: me, readAt: null },
      { readAt: new Date() }
    );

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages  — send a message (REST fallback; real-time uses socket)
router.post('/', auth, async (req, res) => {
  try {
    const { recipientId, content, type, location } = req.body;
    if (!recipientId) return res.status(400).json({ error: 'recipientId is required' });

    if (!(await areFriends(req.user._id, recipientId)))
      return res.status(403).json({ error: 'Not friends' });

    const msg = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      type: type || 'text',
      content: content || '',
      location: location || undefined,
    });
    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
