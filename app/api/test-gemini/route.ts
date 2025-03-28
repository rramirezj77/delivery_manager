import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    console.log('Testing Gemini API configuration...');
    console.log('API Key present:', !!process.env.GOOGLE_API_KEY);
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    console.log('Making test request...');
    const result = await model.generateContent("Hello, this is a test message.");
    
    const response = await result.response;
    const text = response.text();
    
    console.log('Test successful! Response:', text);
    
    return NextResponse.json({
      success: true,
      message: 'Gemini API test successful',
      response: text
    });
  } catch (error: any) {
    console.error('Gemini API test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        stack: error.stack,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasGoogleKey: !!process.env.GOOGLE_API_KEY,
          model: 'gemini-2.0-flash'
        }
      }
    }, { status: 500 });
  }
} 