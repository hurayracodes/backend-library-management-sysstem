import Book from "../models/Book.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create a new book (with PDF support)
// @route   POST /api/books
// @access  Private/Admin
export const createBook = async (req, res, next) => {
  try {
    console.log("Request body:", req.body); // ✅ DEBUG
    console.log("Request files:", req.files);
    const { title, author, isbn, category, copies, coverImage, description } =
      req.body;
    console.log("Extracted data:", { title, author, isbn, category, copies }); // ✅ DEBUG

    // Check if book with same ISBN already exists
    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      // Clean up uploaded files if any
      if (req.files) {
        if (req.files.pdfFile) {
          fs.unlinkSync(req.files.pdfFile[0].path);
        }
        if (req.files.coverImage) {
          fs.unlinkSync(req.files.coverImage[0].path);
        }
      }
      return res.status(400).json({
        success: false,
        message: "Book with this ISBN already exists",
      });
    }

    // Prepare book data
    const bookData = {
      title,
      author,
      isbn,
      category,
      copies: copies || 1,
      availableCopies: copies || 1,
      coverImage: coverImage || "",
      description: description || "",
    };

    // Handle uploaded files
    if (req.files) {
      // Handle cover image
      if (req.files.coverImage) {
        bookData.coverImage = `/uploads/images/${req.files.coverImage[0].filename}`;
      }

      // Handle PDF file
      if (req.files.pdfFile) {
        const pdf = req.files.pdfFile[0];
        bookData.pdfFile = {
          filename: pdf.originalname,
          path: pdf.path,
          size: pdf.size,
          mimetype: pdf.mimetype,
          uploadedAt: new Date(),
        };
        bookData.isPdfAvailable = true;
        bookData.pdfUrl = `/uploads/pdfs/${pdf.filename}`;
      }
    }

    const book = await Book.create(bookData);

    res.status(201).json({
      success: true,
      data: book,
      message: "Book created successfully",
    });
  } catch (error) {
    // Clean up uploaded files if error
    if (req.files) {
      if (req.files.pdfFile) {
        fs.unlinkSync(req.files.pdfFile[0].path);
      }
      if (req.files.coverImage) {
        fs.unlinkSync(req.files.coverImage[0].path);
      }
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    next(error);
  }
};

// @desc    Get all books (with PDF info)
// @route   GET /api/books
// @access  Public
// FIXED: Removed 'default' keyword
export const getAllBooks = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } },
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

    // Select fields - exclude file path for security
    const books = await Book.find(query)
      .select("-pdfFile.path") // Don't send file path to client
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
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single book by ID (with PDF info)
// @route   GET /api/books/:id
// @access  Public
export const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).select("-pdfFile.path"); // Don't send file path

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a book (with PDF support)
// @route   PUT /api/books/:id
// @access  Private/Admin
export const updateBook = async (req, res, next) => {
  try {
    const {
      title,
      author,
      isbn,
      category,
      copies,
      coverImage,
      description,
      allowDownload,
    } = req.body;

    let book = await Book.findById(req.params.id);

    if (!book) {
      // Clean up uploaded files if any
      if (req.files) {
        if (req.files.pdfFile) {
          fs.unlinkSync(req.files.pdfFile[0].path);
        }
        if (req.files.coverImage) {
          fs.unlinkSync(req.files.coverImage[0].path);
        }
      }
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Check if ISBN is being changed and if it already exists
    if (isbn && isbn !== book.isbn) {
      const existingBook = await Book.findOne({ isbn });
      if (existingBook) {
        // Clean up uploaded files
        if (req.files) {
          if (req.files.pdfFile) {
            fs.unlinkSync(req.files.pdfFile[0].path);
          }
          if (req.files.coverImage) {
            fs.unlinkSync(req.files.coverImage[0].path);
          }
        }
        return res.status(400).json({
          success: false,
          message: "Book with this ISBN already exists",
        });
      }
    }

    // Calculate available copies if copies is being updated
    let availableCopies = book.availableCopies;
    if (copies !== undefined && copies !== book.copies) {
      const diff = copies - book.copies;
      availableCopies = book.availableCopies + diff;
    }

    // Prepare update data
    const updateData = {
      title: title || book.title,
      author: author || book.author,
      isbn: isbn || book.isbn,
      category: category || book.category,
      copies: copies || book.copies,
      availableCopies: availableCopies,
      description: description !== undefined ? description : book.description,
      allowDownload:
        allowDownload !== undefined ? allowDownload : book.allowDownload,
    };

    // Handle cover image update
    if (req.files && req.files.coverImage) {
      // Delete old cover image if not default
      if (book.coverImage && !book.coverImage.includes("default")) {
        const oldCoverPath = path.join(
          __dirname,
          "../../uploads/images",
          path.basename(book.coverImage),
        );
        if (fs.existsSync(oldCoverPath)) {
          fs.unlinkSync(oldCoverPath);
        }
      }
      updateData.coverImage = `/uploads/images/${req.files.coverImage[0].filename}`;
    } else if (coverImage !== undefined) {
      updateData.coverImage = coverImage;
    }

    // Handle PDF update
    if (req.files && req.files.pdfFile) {
      // Delete old PDF if exists
      if (book.pdfFile && book.pdfFile.path) {
        if (fs.existsSync(book.pdfFile.path)) {
          fs.unlinkSync(book.pdfFile.path);
        }
      }

      const pdf = req.files.pdfFile[0];
      updateData.pdfFile = {
        filename: pdf.originalname,
        path: pdf.path,
        size: pdf.size,
        mimetype: pdf.mimetype,
        uploadedAt: new Date(),
      };
      updateData.isPdfAvailable = true;
      updateData.pdfUrl = `/uploads/pdfs/${pdf.filename}`;
    }

    book = await Book.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-pdfFile.path");

    res.status(200).json({
      success: true,
      data: book,
      message: "Book updated successfully",
    });
  } catch (error) {
    // Clean up uploaded files if error
    if (req.files) {
      if (req.files.pdfFile) {
        fs.unlinkSync(req.files.pdfFile[0].path);
      }
      if (req.files.coverImage) {
        fs.unlinkSync(req.files.coverImage[0].path);
      }
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    next(error);
  }
};

// @desc    Delete a book (with file cleanup)
// @route   DELETE /api/books/:id
// @access  Private/Admin
export const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Delete PDF file if exists
    if (book.pdfFile && book.pdfFile.path) {
      if (fs.existsSync(book.pdfFile.path)) {
        fs.unlinkSync(book.pdfFile.path);
      }
    }

    // Delete cover image if exists and not default
    if (book.coverImage && !book.coverImage.includes("default")) {
      const coverPath = path.join(__dirname, "../../public", book.coverImage);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    await Book.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// MISSING FUNCTIONS - ADD THESE
// ============================================

// @desc    Get all categories
// @route   GET /api/books/categories
// @access  Public
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Book.distinct("category");

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available books (copies > 0)
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
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
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
      .select("-pdfFile.path")
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
        pages: Math.ceil(total / limitNum),
      },
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
        message: "Search query is required",
      });
    }

    // Build query
    let query = {
      $or: [
        { title: { $regex: q, $options: "i" } },
        { author: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { isbn: { $regex: q, $options: "i" } },
      ],
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
      .select("-pdfFile.path")
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
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PDF-SPECIFIC FUNCTIONS
// ============================================

// @desc    Upload PDF for existing book
// @route   POST /api/books/:id/upload-pdf
// @access  Private/Admin
export const uploadBookPdf = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Delete old PDF if exists
    if (book.pdfFile && book.pdfFile.path) {
      if (fs.existsSync(book.pdfFile.path)) {
        fs.unlinkSync(book.pdfFile.path);
      }
    }

    // Update with new PDF
    const pdf = req.file;
    book.pdfFile = {
      filename: pdf.originalname,
      path: pdf.path,
      size: pdf.size,
      mimetype: pdf.mimetype,
      uploadedAt: new Date(),
    };
    book.isPdfAvailable = true;
    book.pdfUrl = `/api/books/pdf/${pdf.filename}`;

    await book.save();

    res.status(200).json({
      success: true,
      message: "PDF uploaded successfully",
      data: {
        isPdfAvailable: book.isPdfAvailable,
        pdfUrl: book.pdfUrl,
        pdfFile: {
          filename: book.pdfFile.filename,
          size: book.pdfFile.size,
          uploadedAt: book.pdfFile.uploadedAt,
        },
      },
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Get PDF for reading (stream to browser)
// @route   GET /api/books/pdf/:filename
// @access  Public (with authentication if needed)
export const getPdf = async (req, res, next) => {
  try {
    let filename = req.params.filename;

    // Decode URL-encoded filename (handle spaces and special characters)
    filename = decodeURIComponent(filename);

    // Security: Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, "../../uploads/pdfs", safeFilename);

    // First, try direct file access
    if (fs.existsSync(filePath)) {
      // Find book with this PDF to update read count
      const book = await Book.findOne({ "pdfFile.filename": safeFilename });
      if (book) {
        book.totalReads = (book.totalReads || 0) + 1;
        book.lastReadAt = new Date();
        await book.save();
      }

      // Stream the file
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);
      res.setHeader("Content-Length", fs.statSync(filePath).size);
      res.setHeader("Accept-Ranges", "bytes");

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      fileStream.on("error", (error) => next(error));
      return;
    }

    // Fallback: If direct file doesn't exist, search for book by original filename
    console.log(`PDF not found at direct path: ${filePath}. Searching database...`);
    const book = await Book.findOne({ "pdfFile.filename": safeFilename });

    if (book && book.pdfFile && book.pdfFile.path) {
      // Use the path stored in database
      const actualFilePath = book.pdfFile.path;
      
      if (fs.existsSync(actualFilePath)) {
        console.log(`Found PDF at: ${actualFilePath}`);
        
        // Update read count
        book.totalReads = (book.totalReads || 0) + 1;
        book.lastReadAt = new Date();
        await book.save();

        // Stream the file
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);
        res.setHeader("Content-Length", fs.statSync(actualFilePath).size);
        res.setHeader("Accept-Ranges", "bytes");

        const fileStream = fs.createReadStream(actualFilePath);
        fileStream.pipe(res);
        fileStream.on("error", (error) => next(error));
        return;
      }
    }

    // PDF not found anywhere
    console.error(`PDF not found. Filename: ${filename}, Searched: ${filePath}, Book: ${book ? 'found' : 'not found'}`);
    return res.status(404).json({
      success: false,
      message: "PDF not found",
      debug: process.env.NODE_ENV === 'development' ? { 
        requestedFilename: filename,
        searchedPath: filePath,
        bookFound: !!book,
        bookPath: book?.pdfFile?.path 
      } : undefined
    });
  } catch (error) {
    console.error("Error in getPdf:", error);
    next(error);
  }
};

// @desc    Download PDF (if allowed)
// @route   GET /api/books/:id/download-pdf
// @access  Private/Student
export const downloadPdf = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book || !book.pdfFile) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    // Check if download is allowed
    if (!book.allowDownload) {
      return res.status(403).json({
        success: false,
        message: "Download not allowed for this book",
      });
    }

    const filePath = book.pdfFile.path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "PDF file missing",
      });
    }

    // Set headers for download
    const filename = `${book.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", fs.statSync(filePath).size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("error", (error) => {
      next(error);
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get books with PDF available
// @route   GET /api/books/with-pdf
// @access  Public
export const getBooksWithPdf = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const books = await Book.find({ isPdfAvailable: true })
      .select("-pdfFile.path")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Book.countDocuments({ isPdfAvailable: true });

    res.status(200).json({
      success: true,
      data: books,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get PDF metadata
// @route   GET /api/books/:id/pdf-info
// @access  Private/Student
export const getPdfInfo = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).select(
      "title author pdfFile.isPdfAvailable pdfFile.filename pdfFile.size pdfFile.uploadedAt totalReads allowDownload",
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (!book.isPdfAvailable) {
      return res.status(404).json({
        success: false,
        message: "No PDF available for this book",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        title: book.title,
        author: book.author,
        filename: book.pdfFile?.filename,
        size: book.pdfFile?.size,
        uploadedAt: book.pdfFile?.uploadedAt,
        totalReads: book.totalReads || 0,
        allowDownload: book.allowDownload,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    View PDF by Book ID (for students)
// @route   GET /api/books/:id/view-pdf
// @access  Public
export const viewPdfById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (!book.isPdfAvailable || !book.pdfFile || !book.pdfFile.path) {
      return res.status(404).json({
        success: false,
        message: "PDF not available for this book",
      });
    }

    const filePath = book.pdfFile.path;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`PDF file not found at: ${filePath}`);
      return res.status(404).json({
        success: false,
        message: "PDF file not found on server",
      });
    }

    // Update read count
    book.totalReads = (book.totalReads || 0) + 1;
    book.lastReadAt = new Date();
    await book.save();

    // Stream the PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${book.title}.pdf"`);
    res.setHeader("Content-Length", fs.statSync(filePath).size);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    fileStream.on("error", (error) => {
      console.error("Stream error:", error);
      next(error);
    });
  } catch (error) {
    console.error("Error in viewPdfById:", error);
    next(error);
  }
};

// @desc    Check if student has access to book PDF
// @route   Middleware
export const checkBookAccess = async (req, res, next) => {
  try {
    // Agar admin hai to direct allow karo
    if (req.user && req.user.role === "admin") {
      return next();
    }

    // Student ke liye check
    const filename = req.params.filename;
    const bookId = req.params.id;

    let book;
    if (filename) {
      book = await Book.findOne({ "pdfFile.filename": filename });
    } else if (bookId) {
      book = await Book.findById(bookId);
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Check if student has issued this book
    const IssueRecord = mongoose.model("IssueRecord");
    const hasIssued = await IssueRecord.findOne({
      bookId: book._id,
      userId: req.user._id,
      status: "issued",
    });

    if (!hasIssued) {
      return res.status(403).json({
        success: false,
        message: "You can only access PDF of books you have issued",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
