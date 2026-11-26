import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Course, User } from '../models/index.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  const filter = q ? { $or: [{ title: { $regex: q, $options: 'i' } }, { code: { $regex: q, $options: 'i' } }, { department: { $regex: q, $options: 'i' } }] } : {};
  const courses = await Course.find(filter).populate('students', 'name').sort({ code: 1 });
  res.json({ courses: courses.map(c => ({ ...c.toObject(), enrolledCount: c.students.length, enrolled: c.students.some(s => String(s._id) === String(req.user._id)), students: undefined })) });
});
router.post('/', allowRoles('faculty', 'admin'), [
  body('code').trim().notEmpty().withMessage('Course code is required.'),
  body('title').trim().notEmpty().withMessage('Course title is required.'),
  body('department').trim().notEmpty().withMessage('Department is required.'),
  body('faculty').trim().notEmpty().withMessage('Faculty name is required.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const course = await Course.create(req.body);
  res.status(201).json({ course });
});
router.post('/:id/enroll', allowRoles('student'), async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found.' });
  if (course.students.some(id => String(id) === String(req.user._id))) return res.status(409).json({ message: 'You are already enrolled in this course.' });
  if (course.students.length >= course.capacity) return res.status(409).json({ message: 'This course is at capacity.' });
  course.students.push(req.user._id);
  req.user.enrolledCourses.push(course._id);
  await Promise.all([course.save(), req.user.save()]);
  res.json({ message: `Enrolled in ${course.code} successfully.` });
});
export default router;
