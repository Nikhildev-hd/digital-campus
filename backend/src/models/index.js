import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty', 'admin'], default: 'student' },
  department: { type: String, default: 'General' },
  studentId: { type: String, default: '' },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  faculty: { type: String, required: true, trim: true },
  credits: { type: Number, min: 1, max: 10, default: 3 },
  semester: { type: String, default: 'Semester 1' },
  description: { type: String, default: '' },
  capacity: { type: Number, min: 1, default: 60 },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  body: { type: String, required: true, trim: true, maxlength: 3000 },
  category: { type: String, enum: ['General', 'Academic', 'Events', 'Urgent'], default: 'General' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true }
}, { timestamps: true });

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  courseCode: { type: String, required: true, trim: true, uppercase: true },
  dueDate: { type: Date, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Open', 'Submitted', 'Closed'], default: 'Open' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
export const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
