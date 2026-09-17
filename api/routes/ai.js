import express from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';

dotenv.config();

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/generate', requireSession, async (req, res) => {
  const { prompt, model = "gemini-1.5-flash" } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ status: 'error', message: 'Prompt is required' });
  }

  try {
    const genModel = genAI.getGenerativeModel({ model });
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    await db.execute('INSERT INTO integration_results (id,action,user_id,request_data,response_data) VALUES (?,?,?,?,?)',
      [crypto.randomUUID(), 'generateAI', req.user.id, JSON.stringify({ prompt, model }), JSON.stringify({ text })]);
    
    res.json({ status: 'success', text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
