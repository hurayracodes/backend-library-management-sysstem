import Issue from '../models/Issue.js';
import Book from '../models/Book.js';
import User from '../models/User.js';

// @desc    Issue a book to a student
// @route   POST /api/issues
// @access  Private/Admin
export const createIssue = async (req, res, next) => {
  try {
    const { student, bookId, dueDate } = req.body;

    // Validate required fields
    if (!student || !bookId || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide student name, book, and due date'
      });
    }

    // Find the book
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if book is available
    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No copies available for issue'
      });
    }

    // Try to find user by name (case-insensitive search)
    let userId = null;
    const user = await User.findOne({ 
      name: { $regex: new RegExp(`^${student}$`, 'i') }
    });
    
    if (user) {
      userId = user._id;
    }

    // Create issue record
    const issue = await Issue.create({
      userId, // Can be null for admin-created issues without matching user
      student,
      book: bookId,
      bookTitle: book.title,
      dueDate,
      status: 'issued'
    });

    // Update book available copies
    book.availableCopies -= 1;
    await book.save();

    res.status(201).json({
      success: true,
      data: issue,
      message: 'Book issued successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    next(error);
  }
};

// @desc    Get all issues
// @route   GET /api/issues
// @access  Private/Admin
export const getAllIssues = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { student: { $regex: search, $options: 'i' } },
        { bookTitle: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const issues = await Issue.find(query)
      .populate('book', 'title author isbn')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Issue.countDocuments(query);

    res.status(200).json({
      success: true,
      data: issues,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single issue by ID
// @route   GET /api/issues/:id
// @access  Private/Admin
export const getIssueById = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id).populate('book');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Return a book
// @route   PUT /api/issues/:id/return
// @access  Private/Admin
export const returnBook = async (req, res, next) => {
  try {
    let issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue record not found'
      });
    }

    if (issue.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Book already returned'
      });
    }

    // Calculate fine if overdue
    const now = new Date();
    const dueDate = new Date(issue.dueDate);
    let fine = 0;

    if (now > dueDate) {
      // Calculate days overdue (1 day = $1 fine)
      const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      fine = daysOverdue; // $1 per day
    }

    // Update issue record
    issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        status: 'returned',
        returnDate: now,
        fine: fine
      },
      { new: true }
    ).populate('book', 'title author isbn');

    // Update book available copies
    const book = await Book.findById(issue.book._id);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }

    res.status(200).json({
      success: true,
      data: issue,
      message: fine > 0 ? `Book returned with fine of $${fine}` : 'Book returned successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/issues/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res, next) => {
  try {
    // Get total books count
    const totalBooks = await Book.countDocuments();

    // Get total users count (excluding admins)
    const totalUsers = await User.countDocuments({ role: 'user' });

    // Get currently issued books count
    const issuedBooks = await Issue.countDocuments({ status: 'issued' });

    // Get overdue books count
    const overdueBooks = await Issue.countDocuments({ 
      status: 'issued',
      dueDate: { $lt: new Date() }
    });

    // Get returned books count
    const returnedBooks = await Issue.countDocuments({ status: 'returned' });

    // Get recent issues
    const recentIssues = await Issue.find()
      .populate('book', 'title author')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate total fines
    const totalFines = await Issue.aggregate([
      { $group: { _id: null, total: { $sum: '$fine' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBooks,
        totalUsers,
        issuedBooks,
        overdueBooks,
        returnedBooks,
        totalFines: totalFines[0]?.total || 0,
        recentIssues
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update overdue status
// @route   PUT /api/issues/update-overdue
// @access  Private/Admin
export const updateOverdueStatus = async (req, res, next) => {
  try {
    // Update all overdue issues
    const result = await Issue.updateMany(
      { 
        status: 'issued',
        dueDate: { $lt: new Date() }
      },
      { status: 'overdue' }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} issues updated to overdue`
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// USER-SPECIFIC FUNCTIONS
// ============================================

// @desc    Get logged-in user's borrowed books
// @route   GET /api/issues/my-issues
// @access  Private/User
export const getMyIssues = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const issues = await Issue.find({ 
      userId,
      status: { $in: ['issued', 'overdue'] }
    })
      .populate('book', 'title author isbn coverImage category isPdfAvailable pdfUrl pdfFile allowDownload description')
      .sort({ issueDate: -1 });

    res.status(200).json({
      success: true,
      data: issues,
      count: issues.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's return history
// @route   GET /api/issues/my-history
// @access  Private/User
export const getMyHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const issues = await Issue.find({ 
      userId,
      status: 'returned'
    })
      .populate('book', 'title author isbn coverImage category isPdfAvailable pdfUrl pdfFile allowDownload description')
      .sort({ returnDate: -1 });

    res.status(200).json({
      success: true,
      data: issues,
      count: issues.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user stats
// @route   GET /api/issues/user-stats
// @access  Private/User
export const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Total books borrowed (all time)
    const totalBorrowed = await Issue.countDocuments({ userId });
    
    // Currently borrowed (active issues)
    const currentlyBorrowed = await Issue.countDocuments({ 
      userId,
      status: { $in: ['issued', 'overdue'] }
    });
    
    // Pending returns (overdue)
    const pendingReturns = await Issue.countDocuments({
      userId,
      status: 'overdue'
    });
    
    // Recent activity (last 5)
    const recentActivity = await Issue.find({ userId })
      .populate('book', 'title author')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate total fines paid
    const finesData = await Issue.aggregate([
      { $match: { userId: req.user._id, status: 'returned' } },
      { $group: { _id: null, totalFines: { $sum: '$fine' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBorrowed,
        currentlyBorrowed,
        pendingReturns,
        totalFinesPaid: finesData[0]?.totalFines || 0,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    User borrows a book
// @route   POST /api/issues/borrow/:bookId
// @access  Private/User
export const borrowBook = async (req, res, next) => {
  try {
    const bookId = req.params.bookId;
    const userId = req.user._id;
    const userName = req.user.name;

    // Find the book
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if book is available
    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No copies available for borrowing'
      });
    }

    // Check if user already has this book borrowed
    const existingIssue = await Issue.findOne({
      userId,
      book: bookId,
      status: { $in: ['issued', 'overdue'] }
    });

    if (existingIssue) {
      return res.status(400).json({
        success: false,
        message: 'You already have this book borrowed'
      });
    }

    // Calculate due date (14 days from now)
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // Create issue record
    const issue = await Issue.create({
      userId,
      student: userName,
      book: bookId,
      bookTitle: book.title,
      issueDate,
      dueDate,
      status: 'issued'
    });

    // Update book available copies
    book.availableCopies -= 1;
    await book.save();

    res.status(201).json({
      success: true,
      data: issue,
      message: 'Book borrowed successfully! Due date: ' + dueDate.toLocaleDateString()
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    next(error);
  }
};

// @desc    User returns a book
// @route   PUT /api/issues/return/:issueId
// @access  Private/User
export const userReturnBook = async (req, res, next) => {
  try {
    const issueId = req.params.issueId;
    const userId = req.user._id;

    let issue = await Issue.findOne({ _id: issueId, userId });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue record not found'
      });
    }

    if (issue.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Book already returned'
      });
    }

    // Calculate fine if overdue
    const now = new Date();
    const dueDate = new Date(issue.dueDate);
    let fine = 0;

    if (now > dueDate) {
      // Calculate days overdue (1 day = $1 fine)
      const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      fine = daysOverdue; // $1 per day
    }

    // Update issue record
    issue = await Issue.findByIdAndUpdate(
      issueId,
      {
        status: 'returned',
        returnDate: now,
        returnedAt: now,
        fine: fine
      },
      { new: true }
    ).populate('book', 'title author isbn');

    // Update book available copies
    const book = await Book.findById(issue.book._id);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }

    res.status(200).json({
      success: true,
      data: issue,
      message: fine > 0 ? `Book returned with fine of $${fine}` : 'Book returned successfully'
    });
  } catch (error) {
    next(error);
  }
};
