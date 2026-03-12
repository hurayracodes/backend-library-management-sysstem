import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import helmet from 'helmet'
import compression from 'compression'
import path from 'path';  // ✅ PATH MODULE IMPORT KARO
import { fileURLToPath } from 'url';  // ✅ ES MODULES KE LIYE
import connectDB from './config/database.js';
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

// Load environment variables
dotenv.config();

// ES modules ke liye __dirname define karo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
connectDB();

// app 
const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // PDFs ke liye allow
}));
app.use(compression());
app.use(morgan('dev'));

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ============================================
// STATIC FILES SERVING - YEH IMPORTANT HAI
// ============================================

// Serve uploaded files (PDFs and images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve public folder (default images)
app.use('/public', express.static(path.join(__dirname, 'public')));

// ============================================
// ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/reports', reportRoutes);

// ============================================
// HOME ROUTE
// ============================================
app.get('/', async (req, res) => {
    res.json({
        success: true,
        msg: "Library Management System API is running",
        endpoints: {
            auth: "/api/auth",
            books: "/api/books",
            issues: "/api/issues",
            reports: "/api/reports",
            pdfView: "/api/books/pdf/:filename",
            pdfDownload: "/api/books/:id/download-pdf"
        }
    });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ============================================
// SERVER START
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
  console.log(`📄 PDF endpoint: http://localhost:${PORT}/api/books/pdf/:filename`);
});