import { GoogleGenerativeAI } from '@google/generative-ai';

// WARNING: Hardcoding API keys is a security risk. Consider using environment variables instead.
const API_KEY = 'AIzaSyCwgLSfysfRAnLDlZ9_M_XuE9-bdA3bWE8';

// Initialize Gemini API with hardcoded key
const genAI = new GoogleGenerativeAI(API_KEY);

export const analyzePatientData = async (patientData: any, medicalHistory: any[]) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Analyze the following patient data and medical history for emergency healthcare insights:
    
    Patient Data: ${JSON.stringify(patientData)}
    Medical History: ${JSON.stringify(medicalHistory)}
    
    Please provide:
    1. Risk assessment (Low/Medium/High/Critical)
    2. Potential emergency conditions to watch for
    3. Relevant medical history patterns
    4. Recommended immediate actions
    5. Specialist referral recommendations
    
    Format the response as JSON with the following structure:
    {
      "riskLevel": "string",
      "emergencyConditions": ["string"],
      "medicalPatterns": ["string"], 
      "immediateActions": ["string"],
      "specialistReferrals": ["string"],
      "confidence": number
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error('Error analyzing patient data:', error);
    throw error;
  }
};

export const predictBedAvailability = async (hospitalData: any[], currentDemand: any) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze hospital bed availability and predict capacity for the next 24 hours:
    
    Hospital Data: ${JSON.stringify(hospitalData)}
    Current Demand: ${JSON.stringify(currentDemand)}
    
    Provide predictions for:
    1. Expected bed occupancy rates
    2. Critical capacity alerts
    3. Resource redistribution recommendations
    4. Emergency surge preparation
    
    Return as JSON:
    {
      "predictions": [{"hospitalId": "string", "expectedOccupancy": number, "availableBeds": number}],
      "alerts": [{"hospitalId": "string", "severity": "string", "message": "string"}],
      "recommendations": ["string"]
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text());
};

export const generateEmergencyInsights = async (emergencyData: any) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Generate emergency healthcare insights based on:
    ${JSON.stringify(emergencyData)}
    
    Analyze and provide:
    1. Severity classification
    2. Resource requirements
    3. Treatment protocols
    4. Risk factors
    5. Monitoring recommendations
    
    Return structured JSON response.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text());
};