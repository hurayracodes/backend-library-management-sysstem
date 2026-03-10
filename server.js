import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import helmet from 'helmet'
import compression from 'compression'
import connectDB from './config/database.js';
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

// Load environment variables
dotenv.config();

// Connect to database
connectDB();
// app 
const app = express()

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', async (req, res) => {
    res.json({
        success:true,
        msg:"Server is fine please do somthing"
    })
    
})
// port 
const PORT = process.env.PORT || 5000;

// app listen
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
