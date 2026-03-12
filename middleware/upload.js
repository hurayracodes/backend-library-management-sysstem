import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directories if they don't exist
const pdfDir = 'uploads/pdfs';
const imagesDir = 'uploads/images';
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configure storage with dynamic destination
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Direct PDFs to pdfs folder, images to images folder
    if (file.fieldname === 'pdfFile') {
      cb(null, pdfDir);
    } else if (file.fieldname === 'coverImage') {
      cb(null, imagesDir);
    } else {
      cb(null, 'uploads');
    }
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter - allow images AND PDFs based on field name
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'pdfFile') {
    // Only allow PDFs for pdfFile field
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for PDF field!'), false);
    }
  } else if (file.fieldname === 'coverImage') {
    // Allow images for coverImage field
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed for cover image!'), false);
    }
  } else {
    cb(new Error('Unknown file field!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// For multiple files (cover image + pdf)
export const uploadBookFiles = upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]);

// For single PDF upload
export const uploadPdf = upload.single('pdfFile');

// Error handler for multer
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};