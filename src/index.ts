import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RecordModel, UserModel } from './db';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { JWT_PASSWORD } from './config';
import { userMiddleware } from './middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const connectWithRetry = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();


mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  connectWithRetry();
});

app.post('/api/signup', async (req, res) => {
  const requiredBody = z.object({
    username: z.string().min(8).max(30),
    password: z.string().min(8).max(30)
  })

  const parseBody = requiredBody.safeParse(req.body);
  if(!parseBody.success){
    res.status(400).json({
      message: "Check the credentials"
    })
  }

  try{
    const { username, password } = req.body;
    await UserModel.create({
      username: username, 
      password: password
    })
    res.status(400).json({
      message: "signed up"
    })
  } catch(e) {
    res.status(411).json({
      message: "User already exists"
    })
  }
})

app.post('/api/signin', async (req, res) =>{
  const requiredBody = z.object({
    username: z.string().min(8).max(30),
    password: z.string().min(8).max(30)
  })

  const parseBody = requiredBody.safeParse(req.body);
  if(!parseBody.success){
    res.status(400).json({
      message: "Check the credentials"
    })
  }

  const { username, password } = req.body;

  const user = await UserModel.findOne({
    username, 
    password
  })

  if(user){
    const token = jwt.sign({
      id: user._id
    }, JWT_PASSWORD)

    res.status(200).json({
      token: token
    })
  } else {
    res.status(400).json({
      message: "Incorrect credentials"
    })
  }
})

app.get('/api/records', userMiddleware, async (req, res) => {
  try {
    const records = await RecordModel.find().sort({ lastUpdated: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching records' });
  }
});


app.get('/api/records/:id', userMiddleware, async(req, res) => {
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


app.post('/api/records', userMiddleware, async (req, res) => {
  try {
    const record = new RecordModel(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: 'Error creating record' });
  }
});


app.put('/api/records/:id', userMiddleware, async (req, res) => {

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


app.delete('/api/records/:id', userMiddleware, async (req, res) => {
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


app.get('/api/stats', userMiddleware, async (req, res) => {
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