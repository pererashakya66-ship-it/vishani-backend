const router = require('express').Router();
const auth = require('../middleware/auth');
const LocationRecord = require('../models/LocationRecord');
const FriendRequest = require('../models/FriendRequest');

// POST /api/location  — save a tracking record
router.post('/', auth, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, speed, isEmergency } = req.body;
    if (latitude == null || longitude == null)
      return res.status(400).json({ error: 'latitude and longitude are required' });

    const record = await LocationRecord.create({
      user: req.user._id,
      latitude,
      longitude,
      accuracy,
      speed,
      isEmergency: !!isEmergency,
    });
    res.status(201).json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/location/public/:userId/latest  — no auth, used by the SOS tracking page
router.get('/public/:userId/latest', async (req, res) => {
  try {
    const record = await LocationRecord.findOne({ user: req.params.userId })
      .sort({ createdAt: -1 });
    res.json({ record: record || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/location/public/:userId/history?limit=60  — no auth, last N points for trail
router.get('/public/:userId/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 60, 200);
    const records = await LocationRecord.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ records: records.reverse() }); // oldest first for polyline
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/location/:userId/latest  — get the latest location of a friend
router.get('/:userId/latest', auth, async (req, res) => {
  try {
    const me = req.user._id;
    const targetId = req.params.userId;

    // Only friends can see each other's location
    const isFriend = await FriendRequest.findOne({
      status: 'accepted',
      $or: [
        { from: me, to: targetId },
        { from: targetId, to: me },
      ],
    });
    if (!isFriend)
      return res.status(403).json({ error: 'Not friends' });

    const record = await LocationRecord.findOne({ user: targetId })
      .sort({ createdAt: -1 });

    if (!record) return res.status(404).json({ error: 'No location data' });
    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
