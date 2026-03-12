// backend/controllers/bookController.js
import Book from '../models/Book.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all categories
export const getCategories = async (req, res) => {
  try {
    // You can fetch from DB or return static list
    const categories = [
      'Fiction', 'Non-Fiction', 'Science', 'Technology', 
      'Mathematics', 'History', 'Biography', 'Other'
    ];
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add new book
export const addBook = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    // Prepare book data
    const bookData = {
      title: req.body.title,
      author: req.body.author,
      isbn: req.body.isbn,
      category: req.body.category,
      copies: parseInt(req.body.copies) || 1,
      description: req.body.description || '',
    };

    // Handle cover image
    if (req.files && req.files.coverImage) {
      bookData.coverImage = req.files.coverImage[0].path.replace(/\\/g, '/');
    }

    // Handle PDF file
    if (req.files && req.files.pdfFile) {
      const pdfFile = req.files.pdfFile[0];
      bookData.pdfFile = pdfFile.path.replace(/\\/g, '/');
      bookData.pdfSize = pdfFile.size; // Size in bytes
      
      // You can extract pages using pdf-parse library
      // bookData.pdfPages = await getPdfPages(pdfFile.path);
    }

    // Set available copies same as total copies
    bookData.availableCopies = bookData.copies;

    // Save to database
    const book = new Book(bookData);
    await book.save();

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: book
    });

  } catch (error) {
    console.error('Error adding book:', error);
    
    // Delete uploaded files if database save fails
    if (req.files) {
      if (req.files.coverImage) {
        await fs.unlink(req.files.coverImage[0].path).catch(console.error);
      }
      if (req.files.pdfFile) {
        await fs.unlink(req.files.pdfFile[0].path).catch(console.error);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error adding book'
    });
  }
};

// Get all books
export const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    
    // Add full URLs for files
    const booksWithUrls = books.map(book => ({
      ...book.toObject(),
      coverImageUrl: book.coverImage ? `http://localhost:3000/${book.coverImage}` : null,
      pdfUrl: book.pdfFile ? `http://localhost:3000/${book.pdfFile}` : null
    }));

    res.status(200).json({
      success: true,
      data: booksWithUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single book
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Add full URLs
    const bookWithUrls = {
      ...book.toObject(),
      coverImageUrl: book.coverImage ? `http://localhost:3000/${book.coverImage}` : null,
      pdfUrl: book.pdfFile ? `http://localhost:3000/${book.pdfFile}` : null
    };

    res.status(200).json({
      success: true,
      data: bookWithUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update book
export const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Update basic fields
    const updateData = {
      title: req.body.title,
      author: req.body.author,
      category: req.body.category,
      copies: parseInt(req.body.copies) || book.copies,
      description: req.body.description || book.description,
    };

    // Update available copies if total copies changed
    if (updateData.copies !== book.copies) {
      const diff = updateData.copies - book.copies;
      updateData.availableCopies = book.availableCopies + diff;
    }

    // Handle new cover image
    if (req.files && req.files.coverImage) {
      // Delete old cover image
      if (book.coverImage) {
        await fs.unlink(book.coverImage).catch(console.error);
      }
      updateData.coverImage = req.files.coverImage[0].path.replace(/\\/g, '/');
    }

    // Handle new PDF file
    if (req.files && req.files.pdfFile) {
      // Delete old PDF file
      if (book.pdfFile) {
        await fs.unlink(book.pdfFile).catch(console.error);
      }
      const pdfFile = req.files.pdfFile[0];
      updateData.pdfFile = pdfFile.path.replace(/\\/g, '/');
      updateData.pdfSize = pdfFile.size;
    }

    // Update book
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    });

  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete book
export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Delete associated files
    if (book.coverImage) {
      await fs.unlink(book.coverImage).catch(console.error);
    }
    if (book.pdfFile) {
      await fs.unlink(book.pdfFile).catch(console.error);
    }

    await Book.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Book deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};