import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  dateOfDeath: {
    type: Date,
    required: true,
  },
  ssn: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'processed'],
    default: 'pending',
  },
  documentVerified: {
    type: Boolean,
    default: false,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  medicalNotes: String,
  verifiedBy: String,
}, {
  timestamps: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String
})

export const UserModel = mongoose.model('User', userSchema)
export const RecordModel = mongoose.model('Record', recordSchema);