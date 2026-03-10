import Book from '../models/Book.js';

// @desc    Create a new book
// @route   POST /api/books
// @access  Private/Admin
export const createBook = async (req, res, next) => {
  try {
    const { title, author, isbn, category, copies, coverImage, description } = req.body;

    // Check if book with same ISBN already exists
    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return res.status(400).json({
        success: false,
        message: 'Book with this ISBN already exists'
      });
    }

    const book = await Book.create({
      title,
      author,
      isbn,
      category,
      copies: copies || 1,
      availableCopies: copies || 1,
      coverImage: coverImage || '',
      description: description || ''
    });

    res.status(201).json({
      success: true,
      data: book,
      message: 'Book created successfully'
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

// @desc    Get all books
// @route   GET /api/books
// @access  Public
export const getAllBooks = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const books = await Book.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Book.countDocuments(query);

    res.status(200).json({
      success: true,
      data: books,
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

// @desc    Get single book by ID
// @route   GET /api/books/:id
// @access  Public
export const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.status(200).json({
      success: true,
      data: book
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a book
// @route   PUT /api/books/:id
// @access  Private/Admin
export const updateBook = async (req, res, next) => {
  try {
    const { title, author, isbn, category, copies, coverImage, description } = req.body;

    let book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if ISBN is being changed and if it already exists
    if (isbn && isbn !== book.isbn) {
      const existingBook = await Book.findOne({ isbn });
      if (existingBook) {
        return res.status(400).json({
          success: false,
          message: 'Book with this ISBN already exists'
        });
      }
    }

    // Calculate available copies if copies is being updated
    let availableCopies = book.availableCopies;
    if (copies !== undefined && copies !== book.copies) {
      const diff = copies - book.copies;
      availableCopies = book.availableCopies + diff;
    }

    book = await Book.findByIdAndUpdate(
      req.params.id,
      {
        title: title || book.title,
        author: author || book.author,
        isbn: isbn || book.isbn,
        category: category || book.category,
        copies: copies || book.copies,
        availableCopies: availableCopies,
        coverImage: coverImage !== undefined ? coverImage : book.coverImage,
        description: description !== undefined ? description : book.description
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: book,
      message: 'Book updated successfully'
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

// @desc    Delete a book
// @route   DELETE /api/books/:id
// @access  Private/Admin
export const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    await Book.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories
// @route   GET /api/books/categories
// @access  Public
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Book.distinct('category');
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// USER-SPECIFIC FUNCTIONS
// ============================================

// @desc    Get only available books
// @route   GET /api/books/available
// @access  Public
export const getAvailableBooks = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 12 } = req.query;

    // Build query - only books with available copies
    let query = { availableCopies: { $gt: 0 } };

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const books = await Book.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Book.countDocuments(query);

    res.status(200).json({
      success: true,
      data: books,
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

// @desc    Search books by title/author/category
// @route   GET /api/books/search
// @access  Public
export const searchBooks = async (req, res, next) => {
  try {
    const { q, category, page = 1, limit = 12 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Build query
    let query = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { isbn: { $regex: q, $options: 'i' } }
      ]
    };

    // Category filter
    if (category) {
      query.category = category;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const books = await Book.find(query)
      .sort({ title: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Book.countDocuments(query);

    res.status(200).json({
      success: true,
      data: books,
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
