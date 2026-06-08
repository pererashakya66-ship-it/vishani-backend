const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '100y' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, mobile, password } = req.body;
    if (!name || !mobile || !password)
      return res.status(400).json({ error: 'name, mobile and password are required' });

    const exists = await User.findOne({ mobile });
    if (exists) return res.status(409).json({ error: 'Mobile number already registered' });

    const user = await User.create({ name, mobile, password });
    res.status(201).json({ token: sign(user._id), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password)
      return res.status(400).json({ error: 'mobile and password are required' });

    const user = await User.findOne({ mobile });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid mobile number or password' });

    res.json({ token: sign(user._id), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/lookup/:mobile  — check if a mobile is registered (used before sending request)
router.get('/lookup/:mobile', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findOne({ mobile: req.params.mobile }).select('_id name mobile');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
