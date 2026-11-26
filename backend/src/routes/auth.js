import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};
const publicUser = user => ({ id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, studentId: user.studentId });
const issueToken = user => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '12h' });

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.'),
  body('email').isEmail().withMessage('Enter a valid email address.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
], validate, async (req, res) => {
  const { name, email, password, department } = req.body;
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), department: department || 'General', role: 'student' });
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
});

router.post('/login', [
  body('email').isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.')
], validate, async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  res.json({ token: issueToken(user), user: publicUser(user) });
});
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
export default router;
