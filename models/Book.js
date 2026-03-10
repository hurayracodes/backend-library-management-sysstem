import mongoose from 'mongoose'

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  author: {
    type: String,
    required: [true, 'Author is required']
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  copies: {
    type: Number,
    required: [true, 'Number of copies is required'],
    default: 1,
    min: [0, 'Copies cannot be negative']
  },
  availableCopies: {
    type: Number,
    default: function() {
      return this.copies;
    },
    min: [0, 'Available copies cannot be negative']
  },
  coverImage: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

const Book = mongoose.models.Book || mongoose.model('Book', bookSchema)
export default Book
