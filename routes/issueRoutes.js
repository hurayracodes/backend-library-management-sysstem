import express from 'express';
import { 
  createIssue, 
  getAllIssues, 
  getIssueById, 
  returnBook, 
  getDashboardStats,
  updateOverdueStatus,
  getMyIssues,
  getMyHistory,
  getUserStats,
  borrowBook,
  userReturnBook
} from '../controllers/issueController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// USER-SPECIFIC ROUTES (Protected - User/Admin)
// ============================================

// Get user's borrowed books
router.get('/my-issues', protect, getMyIssues);

// Get user's return history
router.get('/my-history', protect, getMyHistory);

// Get user stats
router.get('/user-stats', protect, getUserStats);

// User borrows a book
router.post('/borrow/:bookId', protect, borrowBook);

// User returns a book
router.put('/return/:issueId', protect, userReturnBook);

// ============================================
// ADMIN ROUTES
// ============================================

// Protected routes (Admin only)
router.get('/stats', protect, admin, getDashboardStats);
router.put('/update-overdue', protect, admin, updateOverdueStatus);
router.get('/', protect, admin, getAllIssues);
router.get('/:id', protect, admin, getIssueById);
router.post('/', protect, admin, createIssue);
router.put('/:id/return', protect, admin, returnBook);

export default router;
