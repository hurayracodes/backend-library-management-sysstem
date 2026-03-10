import express from 'express';
import { 
  createReport, 
  getAllReports, 
  getMyReports, 
  updateReportStatus, 
  deleteReport 
} from '../controllers/reportController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// USER ROUTES
// ============================================

// Create a new report
router.post('/', protect, createReport);

// Get user's own reports
router.get('/my-reports', protect, getMyReports);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all reports (Admin only)
router.get('/', protect, admin, getAllReports);

// Update report status (Admin only)
router.put('/:id/status', protect, admin, updateReportStatus);

// Delete report (Admin only)
router.delete('/:id', protect, admin, deleteReport);

export default router;
