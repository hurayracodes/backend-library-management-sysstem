import express from 'express';
import { 
  createBook, 
  getAllBooks, 
  getBookById, 
  updateBook, 
  deleteBook,
  getCategories,
  getAvailableBooks,
  searchBooks,
  
  // New PDF controllers import karo
  uploadBookPdf,
  getPdf,
  downloadPdf,
  getBooksWithPdf,
  getPdfInfo,
  viewPdfById
} from '../controllers/bookController.js';

import { protect, admin } from '../middleware/authMiddleware.js';

// Multer upload middleware import karo
import { uploadBookFiles, uploadPdf, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication needed)
// ============================================

// IMPORTANT: Specific routes MUST come before generic /:id route!
router.get('/categories', getCategories);
router.get('/available', getAvailableBooks);
router.get('/search', searchBooks);
router.get('/with-pdf', getBooksWithPdf);

// NEW: View PDF by Book ID (for students/users) - MUST come before generic /:id
router.get('/:id/view-pdf', viewPdfById);

// NEW: View PDF in browser (public route)
router.get('/pdf/:filename', getPdf);

// Generic routes - MUST be last!
router.get('/', getAllBooks);
router.get('/:id', getBookById);

// ============================================
// PROTECTED ROUTES (Admin only - with file upload)
// ============================================

// Specific protected routes
router.post('/:id/upload-pdf',
  protect,
  admin,
  uploadPdf,        // ✅ Single PDF upload
  handleMulterError,
  uploadBookPdf
);

router.get('/:id/download-pdf',
  protect,           // ✅ Sirf logged-in users download kar saken
  downloadPdf
);

router.get('/:id/pdf-info',
  protect,
  getPdfInfo
);

// Generic protected routes
router.post('/', 
  protect, 
  admin, 
  uploadBookFiles,  // ✅ Multiple files upload (cover + pdf)
  handleMulterError, // ✅ Error handling
  createBook
);

router.put('/:id', 
  protect, 
  admin, 
  uploadBookFiles,  // ✅ Allow file updates
  handleMulterError,
  updateBook
);

router.delete('/:id', protect, admin, deleteBook);

export default router;