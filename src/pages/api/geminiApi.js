import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = "AIzaSyBXpSyOyBAY5hBqd4_Mlrlf99zlii-C3Hk";
const MODEL_NAME = 'gemini-2.0-flash';
const genAI = new GoogleGenerativeAI(API_KEY);

// Memoized
const getModel = (() => {
  let modelInstance = null;
  return () => {
    if (!modelInstance) {
      modelInstance = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      });
    }
    return modelInstance;
  };
})();

export const fetchGeminiResponse = async (input, options = {}) => {
  const { timeout = 30000 } = options;
  if (!API_KEY) throw new Error('Gemini API key is not configured');
  if (!input || typeof input !== 'string') throw new Error('Invalid input: Input must be a non-empty string');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const model = getModel();
    const result = await model.generateContent(input, { signal: controller.signal });
    clearTimeout(timeoutId);
    const response = await result.response;
    const text = response.text();
    if (!text) throw new Error('Empty response received from Gemini API');
    const json = processTextToTaskJson(text);
    return { text, json };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Request timed out');
    console.error('Error fetching Gemini API response:', error);
    throw new Error(error.message || 'Failed to fetch response from Gemini API');
  }
};

function processTextToTaskJson(text) {
  try {
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      const jsonText = jsonMatch[0];
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed) && parsed.every(item => 'taskName' in item && 'taskInfo' in item)) {
        return parsed;
      }
    }
    const lines = text.split('\n').filter(line => line.trim());
    const tasks = [];
    let currentTask = {};
    for (const line of lines) {
      if (line.match(/^\d+\./) || line.match(/^- /)) {
        if (Object.keys(currentTask).length) tasks.push(currentTask);
        currentTask = { taskName: line.replace(/^\d+\.|- /, '').trim().slice(0, 20), taskInfo: '' };
      } else if (currentTask.taskName && !currentTask.taskInfo) {
        currentTask.taskInfo = line.trim().slice(0, 50);
      }
    }
    if (Object.keys(currentTask).length) tasks.push(currentTask);
    return tasks.length ? tasks : [{ taskName: 'Default Task', taskInfo: text.slice(0, 50) }];
  } catch (error) {
    console.warn('Could not parse tasks from text:', error);
    return [{ taskName: 'Error', taskInfo: 'Failed to parse tasks' }];
  }
}