const router = require('express').Router();
const auth = require('../middleware/auth');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

// GET /api/friends  — list accepted friends
router.get('/', auth, async (req, res) => {
  try {
    const me = req.user._id;
    const accepted = await FriendRequest.find({
      status: 'accepted',
      $or: [{ from: me }, { to: me }],
    }).populate('from', 'name mobile').populate('to', 'name mobile');

    const friends = accepted.map((r) =>
      r.from._id.equals(me) ? r.to : r.from
    );
    res.json({ friends });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/friends/request  — send request by mobile number
router.post('/request', auth, async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ error: 'mobile is required' });

    const target = await User.findOne({ mobile });
    if (!target) return res.status(404).json({ error: 'User with that mobile not found' });
    if (target._id.equals(req.user._id))
      return res.status(400).json({ error: 'Cannot add yourself' });

    // Check existing request in either direction
    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user._id, to: target._id },
        { from: target._id, to: req.user._id },
      ],
    });
    if (existing) {
      if (existing.status === 'accepted')
        return res.status(409).json({ error: 'Already friends' });
      if (existing.status === 'pending')
        return res.status(409).json({ error: 'Request already pending' });
      // If previously rejected, allow re-send
      existing.status = 'pending';
      existing.from = req.user._id;
      existing.to = target._id;
      await existing.save();
      return res.json({ request: existing });
    }

    const request = await FriendRequest.create({
      from: req.user._id,
      to: target._id,
    });
    res.status(201).json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/friends/requests/incoming  — pending requests sent TO me
router.get('/requests/incoming', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.user._id,
      status: 'pending',
    }).populate('from', 'name mobile');
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/friends/requests/outgoing  — pending requests I sent
router.get('/requests/outgoing', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      from: req.user._id,
      status: 'pending',
    }).populate('to', 'name mobile');
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/friends/requests/:id/accept
router.put('/requests/:id/accept', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findOne({
      _id: req.params.id,
      to: req.user._id,
      status: 'pending',
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    request.status = 'accepted';
    await request.save();
    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/friends/requests/:id/reject
router.put('/requests/:id/reject', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findOne({
      _id: req.params.id,
      to: req.user._id,
      status: 'pending',
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    request.status = 'rejected';
    await request.save();
    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
