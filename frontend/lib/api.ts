import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${BASE}/api/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const queryData = async (question: string, session_id: string, model: string = 'llama-3.1-8b-instant') => {
  const response = await axios.post(`${BASE}/api/query`, { question, session_id, model });
  return response.data;
};

export const chatWithData = async (
  messages: { role: string; content: string }[],
  session_id: string,
  model: string = 'llama-3.1-8b-instant'
) => {
  const response = await axios.post(`${BASE}/api/chat-data`, { messages, session_id, model });
  return response.data;
};


export const getAutoInsights = async (session_id: string, model: string = 'llama-3.1-8b-instant') => {
  const response = await axios.get(`${BASE}/api/auto-insights`, { params: { session_id, model } });
  return response.data;
};

export const getSuggestedQuestions = async (session_id: string, model: string = 'llama-3.1-8b-instant') => {
  const response = await axios.post(`${BASE}/api/suggested-questions`, { session_id, model, question: "" });
  return response.data;
};


export const previewData = async (session_id: string, limit: number = 100) => {
  const response = await axios.get(`${BASE}/api/preview`, { params: { session_id, limit } });
  return response.data;
};

export const summarizePageContext = async (
  current_path: string,
  session_id?: string,
  active_tab?: string,
  data_summary?: string,
  model: string = 'llama-3.1-8b-instant'
) => {
  const response = await axios.post(`${BASE}/api/summarize-context`, {
    current_path,
    session_id,
    active_tab,
    data_summary,
    model,
  });
  return response.data;
};

export const chatPageContext = async (
  messages: { role: string; content: string }[],
  current_path: string,
  session_id?: string,
  active_tab?: string,
  data_summary?: string,
  model: string = 'llama-3.1-8b-instant'
) => {
  const response = await axios.post(`${BASE}/api/chat-context`, {
    messages,
    current_path,
    session_id,
    active_tab,
    data_summary,
    model,
  });
  return response.data;
};


export const getAnomalies = async (session_id: string) => {
  const response = await axios.post(`${BASE}/api/anomalies`, { session_id });
  return response.data;
};
