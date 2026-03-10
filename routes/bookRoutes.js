import express from 'express';
import { 
  createBook, 
  getAllBooks, 
  getBookById, 
  updateBook, 
  deleteBook,
  getCategories,
  getAvailableBooks,
  searchBooks
} from '../controllers/bookController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/categories', getCategories);
router.get('/available', getAvailableBooks);
router.get('/search', searchBooks);
router.get('/', getAllBooks);
router.get('/:id', getBookById);

// Protected routes (Admin only)
router.post('/', protect, admin, createBook);
router.put('/:id', protect, admin, updateBook);
router.delete('/:id', protect, admin, deleteBook);

export default router;
