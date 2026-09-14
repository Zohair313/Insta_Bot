import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Import routes
import reelsRoutes from './routes/reels';
import chatRoutes from './routes/chat';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reels', reelsRoutes);
app.use('/api/chat', chatRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Instagram AI Retriever Backend API is running. Access /health or /api/*' });
});

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Instagram AI Retriever backend is running' });
});

// Start the server
async function startServer() {
  try {
    // MongoDB connection logic will go here
    // if (process.env.MONGODB_URI) {
    //   await mongoose.connect(process.env.MONGODB_URI);
    //   console.log('Connected to MongoDB');
    // }

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
