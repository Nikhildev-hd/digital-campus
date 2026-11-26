import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Assignment } from '../models/index.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);
router.get('/', async (_req, res) => res.json({ assignments: await Assignment.find().sort({ dueDate: 1 }).limit(100) }));
router.post('/', allowRoles('faculty', 'admin'), [
  body('title').trim().notEmpty().withMessage('Assignment title is required.'),
  body('courseCode').trim().notEmpty().withMessage('Course code is required.'),
  body('dueDate').isISO8601().withMessage('Choose a valid due date.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const assignment = await Assignment.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ assignment });
});
export default router;
