import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Announcement } from '../models/index.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);
router.get('/', async (_req, res) => res.json({ announcements: await Announcement.find().sort({ createdAt: -1 }).limit(50) }));
router.post('/', allowRoles('faculty', 'admin'), [
  body('title').trim().isLength({ min: 3, max: 140 }).withMessage('Title must be 3–140 characters.'),
  body('body').trim().isLength({ min: 5, max: 3000 }).withMessage('Announcement must be at least 5 characters.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const announcement = await Announcement.create({ ...req.body, author: req.user._id, authorName: req.user.name });
  res.status(201).json({ announcement });
});
export default router;
