import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchGeminiResponse } from './api/geminiApi.js';
import NewTaskModal from '../components/NewTaskModal';
import { db } from "./api/firebase.js";
import { collection, addDoc } from 'firebase/firestore';

// Constants
const MOTION_TRANSITION = { duration: 0.4, ease: 'easeOut' };
const BUTTON_CONFIG = [
  { label: 'Clear List', bg: 'bg-red-600', hover: 'hover:bg-red-700', border: 'border-red-400/50' },
  { label: 'New Task', bg: 'bg-yellow-600', hover: 'hover:bg-yellow-700', border: 'border-yellow-400/50' },
  { label: 'Export Galaxy', bg: 'bg-green-600', hover: 'hover:bg-green-700', border: 'border-green-400/50' },
];

// Task Card Component
const TaskCard = React.memo(({ task, index, onCheck, onEdit }) => (
  <motion.div 
    className="flex items-center bg-gray-900/80 p-4 rounded-lg shadow-lg border border-yellow-500/30 backdrop-blur-sm"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02, borderColor: 'rgba(234, 179, 8, 0.7)' }}
    transition={MOTION_TRANSITION}
    role="listitem"
    aria-label={`Task: ${task.taskName}`}
  >
    <input
      type="checkbox"
      checked={task.checked || false}
      onChange={() => onCheck(index)}
      className="h-5 w-5 text-yellow-500 focus:ring-yellow-600 border-gray-600 rounded mr-4"
      aria-label={`Toggle completion for ${task.taskName}`}
    />
    <div className="flex-1 text-center mx-4">
      <div className="font-bold text-white text-lg">{task.taskName}</div>
      <div className="text-gray-400 text-sm">{task.taskInfo}</div>
    </div>
    <button
      onClick={() => onEdit(task)}
      className="ml-4 text-yellow-400 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-600 rounded"
      aria-label={`Edit task: ${task.taskName}`}
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </motion.div>
));

// Main Guide Component
const Guide = () => {
  const [tasks, setTasks] = useState([]);
  const [geminiText, setGeminiText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState(new Set());
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [modalTask, setModalTask] = useState(null);
  const [projectName, setProjectName] = useState('Project Name');
  const [error, setError] = useState(null);

  const inputRef = useRef(null);

  // Dynamic Input box height
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 90)}px`;
    }
  }, [userInput]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const prompt = `You are a professional assistant. When given a project outline, first provide a detailed textual response (minimum 50 words) with background context followed by a numbered list of recommended tasks, then without any transition text, output a JSON array where each object contains "taskName" (3-4 unique words) and "taskInfo" (10-20 concise words) representing those same tasks exactly as: [{"taskName":"Task Name Here","taskInfo":"Concise task description here"}]. Project outline: ${userInput}`;
      const response = await fetchGeminiResponse(prompt, { timeout: 15000 });

      const textEndIndex = response.text.indexOf('[');
      const text = textEndIndex !== -1 ? response.text.substring(0, textEndIndex).trim() : response.text;
      const json = response.json && Array.isArray(response.json) ? response.json : [];

      setGeminiText(text);
      setTasks(json);
      setUserInput('');
    } catch (err) {
      setGeminiText('');
      setError(err.message);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [userInput]);

  const toggleExpansion = useCallback(() => setIsExpanded(prev => !prev), []);

  const handleCheckboxChange = useCallback((index) => {
    setCheckedTasks(prev => {
      const newChecked = new Set(prev);
      newChecked.has(index) ? newChecked.delete(index) : newChecked.add(index);
      return newChecked;
    });
  }, []);

  const handleEditTask = useCallback((task) => {
    setModalTask({ ...task, taskID: `${Date.now()}` });
    setIsNewTaskModalOpen(true);
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
    setCheckedTasks(new Set());
    setProjectName('Project Name');
  }, []);

  const addNewTask = useCallback((newTask) => {
    setTasks(prev => modalTask
      ? prev.map(t => t.taskName === modalTask.taskName ? { ...t, ...newTask } : t)
      : [...prev, newTask]);
    setIsNewTaskModalOpen(false);
    setModalTask(null);
  }, [modalTask]);

  const handleModalClose = useCallback(() => {
    setIsNewTaskModalOpen(false);
    setModalTask(null);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  const exportTasksToFirebase = useCallback(async () => {
    const checkedTasksArray = Array.from(checkedTasks);
    if (!checkedTasksArray.length) {
      alert("Please select tasks to export");
      return;
    }
  
    const requiredFields = ['taskName', 'taskInfo'];
    const invalidTasks = checkedTasksArray.filter(index => {
      const task = tasks[index];
      return requiredFields.some(field => 
        !task[field] || (Array.isArray(task[field]) && task[field].length === 0)
      );
    });
  
    if (invalidTasks.length > 0) {
      alert("Some selected tasks are missing required fields. Please fill in all fields before exporting.");
      return;
    }
  
    try {
      const tasksCollection = collection(db, "tasks");
      await Promise.all(checkedTasksArray.map(index => 
        addDoc(tasksCollection, {
          ...tasks[index],
          taskID: `${Date.now()}`,
          taskCreatedOn: new Date().toISOString().split('T')[0],
        })
      ));
      alert("Tasks exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      setError(err.message);
    }
  }, [checkedTasks, tasks]);

  const buttonActions = useMemo(() => ({
    'Clear List': clearTasks,
    'New Task': () => setIsNewTaskModalOpen(true),
    'Export Galaxy': exportTasksToFirebase,
  }), [clearTasks, exportTasksToFirebase]);

  const TextAnimation = ({ text }) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-3">
        {lines.map((line, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15, duration: 0.5, ease: 'easeOut' }}
            className="text-white font-mono text-lg leading-relaxed tracking-wide"
          >
            {line}
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center overflow-x-hidden px-6 lg:px-8">
      {/* Shift Button */}
      <motion.button
        onClick={toggleExpansion}
        className="fixed top-6 left-1/2 -translate-x-1/2 h-12 w-12 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center z-20 shadow-lg border border-yellow-400/50"
        initial={{ y: -100, rotate: 90 }}
        animate={{ y: 0, rotate: isExpanded ? 0 : 180 }}
        whileHover={{ scale: 1.1, boxShadow: '0 0 15px rgba(234, 179, 8, 0.5)' }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        aria-label={isExpanded ? "Show Task List" : "Hide Task List"}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </motion.button>

      {/* Main Container */}
      <div className="relative w-full max-w-5xl flex flex-col items-center">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-600/90 text-white p-4 rounded-lg shadow-lg z-30 flex items-center gap-2 max-w-[90%]"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={MOTION_TRANSITION}
              role="alert"
            >
              <span className="text-base">Error: {error}</span>
              <button
                onClick={dismissError}
                className="ml-2 text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded"
                aria-label="Dismiss error"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Output/Input/Submit Group */}
        <motion.div
          className="flex flex-col items-center w-full z-10"
          initial={{ opacity: 0, y: 50 }}
          animate={{
            opacity: isExpanded ? 1 : 0,
            y: isExpanded ? 0 : -50,
            x: isExpanded ? 0 : '-100vw',
          }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          {/* Output Box */}
          <motion.div
            className="bg-gray-900/80 text-white p-6 rounded-xl shadow-2xl w-full h-[35rem] overflow-y-auto border-2 border-yellow-500/50 backdrop-blur-sm"
            initial={{ scale: 0.95 }}
            animate={{ scale: isExpanded ? 1 : 0.95 }}
            whileHover={{ borderColor: 'rgba(234, 179, 8, 0.7)' }}
            transition={MOTION_TRANSITION}
            role="region"
            aria-label="Output display"
          >
            {isLoading ? (
              <div className="text-gray-400 h-full flex items-center justify-center">
                <motion.div
                  className="flex flex-col items-center gap-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="text-base">Transmitting to Orbit...</span>
                </motion.div>
              </div>
            ) : geminiText ? (
              <TextAnimation text={geminiText} />
            ) : (
              <div className="text-gray-400 h-full flex items-center justify-center italic font-mono text-lg">
                Cosmic transmissions will appear here...
              </div>
            )}
          </motion.div>

          {/* Input and Submit */}
          <div className="flex items-center justify-center w-full mt-6">
            <form onSubmit={handleSubmit} className="flex-1 w-full flex flex-col sm:flex-row items-center gap-4">
              <motion.textarea
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
                className="bg-gray-900/80 text-white p-4 rounded-xl w-full min-h-[90px] max-h-[20vh] resize-none focus:outline-none focus:ring-2 focus:ring-yellow-600 border-2 border-yellow-500/50 backdrop-blur-sm"
                placeholder="Enter your project outline..."
                disabled={isLoading}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                whileFocus={{ borderColor: 'rgba(234, 179, 8, 0.7)' }}
                transition={MOTION_TRANSITION}
                aria-label="Input project outline"
              />
              <motion.button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-full w-12 h-12 flex items-center justify-center shadow-lg border border-yellow-400/50 mt-0"
                whileHover={{ scale: 1.1, boxShadow: '0 0 15px rgba(234, 179, 8, 0.5)' }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={MOTION_TRANSITION}
                aria-label="Submit project outline"
              >
                <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Task List */}
        <AnimatePresence>
          {!isExpanded && (
            <motion.div
              className="absolute inset-0 w-full max-w-4xl mx-auto h-[42rem] flex flex-col bg-gray-900/80 rounded-xl shadow-2xl border-2 border-yellow-500/50 backdrop-blur-sm"
              initial={{ opacity: 0, x: '100vw' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100vw' }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              whileHover={{ borderColor: 'rgba(234, 179, 8, 0.7)' }}
              role="region"
              aria-label="Task list"
            >
              <div className="flex items-center justify-center p-4 border-b border-yellow-500/50">
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className="bg-transparent text-white font-bold text-lg text-center focus:outline-none focus:ring-2 focus:ring-yellow-600 w-full placeholder-gray-500"
                  placeholder="Project Name"
                  aria-label="Project name"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {tasks.map((task, index) => (
                  <TaskCard
                    key={task.taskID || index}
                    task={{ ...task, checked: checkedTasks.has(index) }}
                    index={index}
                    onCheck={handleCheckboxChange}
                    onEdit={handleEditTask}
                  />
                ))}
              </div>

              <div className="flex flex-row p-4 border-t border-yellow-500/50 gap-4">
                {BUTTON_CONFIG.map((btn, idx) => (
                  <motion.button
                    key={idx}
                    onClick={buttonActions[btn.label]}
                    className={`flex-1 ${btn.bg} ${btn.hover} text-white py-3 rounded-lg shadow-lg border ${btn.border} text-base`}
                    whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(234, 179, 8, 0.5)' }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: idx * 0.1, ease: 'easeOut' }}
                    aria-label={btn.label}
                  >
                    {btn.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isNewTaskModalOpen && (
          <NewTaskModal
            onSave={addNewTask}
            onClose={handleModalClose}
            initialTask={modalTask}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(Guide);