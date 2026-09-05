import mongoose, { Schema, Document } from 'mongoose';

export interface IReel extends Document {
  reelUrl: string;
  caption: string;
  transcript?: string;
  tags: string[];
  embedding?: number[];
  createdAt: Date;
}

const ReelSchema: Schema = new Schema({
  reelUrl: { type: String, required: true, unique: true },
  caption: { type: String, required: true },
  transcript: { type: String },
  tags: { type: [String], default: [] },
  embedding: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export const Reel = mongoose.model<IReel>('Reel', ReelSchema);
