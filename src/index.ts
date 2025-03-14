import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RecordModel } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB with retry logic
const connectWithRetry = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// Handle MongoDB connection errors
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  connectWithRetry();
});

// Get all records
app.get('/api/records', async (req, res) => {
  try {
    const records = await RecordModel.find().sort({ lastUpdated: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching records' });
  }
});

// Get record by ID
app.get('/api/records/:id', async(req, res) => {
  try {
    const record = await RecordModel.findById(req.params.id);
    if (!record) {
     res.status(404).json({ message: 'Record not found' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching record' });
  }
});

// Create new record
app.post('/api/records', async (req, res) => {
  try {
    const record = new RecordModel(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: 'Error creating record' });
  }
});

// Update record
app.put('/api/records/:id', async (req, res) => {

  try {
    const record = await RecordModel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date() },
      { new: true }
    );
    if (!record) {
         res.status(404).json({ message: 'Record not found' });
    }
    res.json(record);
  } catch (error) {
    res.status(400).json({ message: 'Error updating record' });
  }
  
});

// Delete record
app.delete('/api/records/:id', async (req, res) => {
  try {
    const record = await RecordModel.findByIdAndDelete(req.params.id);
    if (!record) {
        res.status(404).json({ message: 'Record not found' });
    }
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting record' });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const total = await RecordModel.countDocuments();
    const pending = await RecordModel.countDocuments({ status: 'pending' });
    const verified = await RecordModel.countDocuments({ status: 'verified' });
    const processed = await RecordModel.countDocuments({ status: 'processed' });

    res.json({ total, pending, verified, processed });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});