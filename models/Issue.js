import mongoose from 'mongoose'

const issueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  student: {
    type: String,
    required: [true, 'Student name is required']
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book is required']
  },
  bookTitle: {
    type: String,
    required: [true, 'Book title is required']
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  returnDate: {
    type: Date,
    default: null
  },
  returnedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['issued', 'returned', 'overdue'],
    default: 'issued'
  },
  fine: {
    type: Number,
    default: 0,
    min: [0, 'Fine cannot be negative']
  }
}, {
  timestamps: true
})

// Note: Overdue status is calculated on-the-fly when fetching issues
// No pre-save hook needed - simplifies middleware issues

const Issue = mongoose.models.Issue || mongoose.model('Issue', issueSchema)
export default Issue
