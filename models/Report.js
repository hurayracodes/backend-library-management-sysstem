import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['return_issue', 'new_book_demand', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending'
  },
  adminResponse: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
export default Report;
