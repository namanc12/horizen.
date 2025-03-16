import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../pages/api/firebase';

// Animation Constants
const ANIMATION_CONFIG = {
  inputFocus: { borderColor: 'rgba(234, 179, 8, 0.7)', scale: 1.02 },
  buttonHover: { scale: 1.05 },
  buttonTap: { scale: 0.95 },
  transition: { duration: 0.2, ease: 'easeOut' },
  modal: {
    initial: { opacity: 0, scale: 0.95, y: -50 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -50 },
  },
};

// Reusable Form Components
const FormInput = memo(({ label, name, type = 'text', value, onChange, readOnly = false, required = false }) => (
  <motion.div className="mb-4" layout>
    <label className="block text-sm mb-1 text-yellow-400 font-medium">{label}</label>
    <motion.input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      required={required}
      className="w-full p-3 bg-gray-800/90 text-white rounded-lg border border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm transition-colors duration-200"
      whileFocus={ANIMATION_CONFIG.inputFocus}
      transition={ANIMATION_CONFIG.transition}
      aria-label={label}
    />
  </motion.div>
));

const FormTextarea = memo(({ label, name, value, onChange, required = false }) => (
  <motion.div className="mb-4" layout>
    <label className="block text-sm mb-1 text-yellow-400 font-medium">{label}</label>
    <motion.textarea
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full p-3 bg-gray-800/90 text-white rounded-lg border border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm transition-colors duration-200"
      rows={4}
      whileFocus={ANIMATION_CONFIG.inputFocus}
      transition={ANIMATION_CONFIG.transition}
      aria-label={label}
    />
  </motion.div>
));

const FormSelect = memo(({ label, name, value, onChange, options, multiple = false }) => (
  <motion.div className="mb-4" layout>
    <label className="block text-sm mb-1 text-yellow-400 font-medium">{label}</label>
    <motion.select
      name={name}
      value={value}
      onChange={onChange}
      multiple={multiple}
      className={`w-full p-3 bg-gray-800/90 text-white rounded-lg border border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm transition-colors duration-200 ${multiple ? 'h-32' : ''}`}
      whileFocus={ANIMATION_CONFIG.inputFocus}
      transition={ANIMATION_CONFIG.transition}
      aria-label={label}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </motion.select>
  </motion.div>
));

const FormRadioGroup = memo(({ label, name, value, onChange, options }) => (
  <motion.div className="mb-4" layout>
    <label className="block text-sm mb-1 text-yellow-400 font-medium">{label}</label>
    <div className="flex flex-wrap gap-4">
      {options.map(option => (
        <motion.label
          key={option.value}
          className="flex items-center cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={onChange}
            className="mr-2 accent-yellow-400 focus:ring-yellow-400"
            aria-label={`${label} ${option.label}`}
          />
          <span className="text-white text-sm">{option.label}</span>
        </motion.label>
      ))}
    </div>
  </motion.div>
));

const NewTaskModal = ({ onSave, onClose, initialTask }) => {
  const [task, setTask] = useState(() => ({
    taskID: `${Date.now()}`,
    taskName: '',
    taskInfo: '',
    taskCreatedOn: new Date().toISOString().split('T')[0],
    taskDueDate: '',
    taskPriority: 'Low',
    taskAccessLvl: 'Member',
    assignedTo: initialTask?.assignedTo || [],
  }));

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Memoized Options
  const priorityOptions = useMemo(() => [
    { value: 'Low', label: 'Low' },
    { value: 'Med', label: 'Medium' },
    { value: 'Urgent', label: 'Urgent' },
  ], []);

  const accessOptions = useMemo(() => [
    { value: 'Member', label: 'Member' },
    { value: 'Manager', label: 'Manager' },
  ], []);

  // Fetch Users from Firebase
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({
          value: doc.data().empID,
          label: doc.data().empName || 'Unknown User',
        }));
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([{ value: '', label: 'Failed to load users' }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Update Task State When Editing
  useEffect(() => {
    if (initialTask) {
      setTask(prev => ({
        ...prev,
        ...initialTask,
        assignedTo: Array.isArray(initialTask.assignedTo) ? initialTask.assignedTo : [initialTask.assignedTo || ''],
      }));
    }
  }, [initialTask]);

  // Form Input Change
  const handleChange = useCallback((e) => {
    const { name, value, type } = e.target;
    if (name === 'assignedTo') {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setTask(prev => ({
        ...prev,
        assignedTo: selectedOptions.filter(Boolean),
      }));
    } else {
      setTask(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  }, []);

  // Form Submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const requiredFields = ['taskName', 'taskInfo'];
    if (!initialTask) requiredFields.push('taskDueDate');
    
    if (requiredFields.some(field => !task[field]) || task.assignedTo.length === 0) {
      alert('Please fill in all required fields and assign at least one user');
      return;
    }
    onSave(task);
  }, [task, onSave, initialTask]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={ANIMATION_CONFIG.transition}
      >
        <motion.div
          className="relative bg-gray-900/95 p-8 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto text-white border-2 border-yellow-500/50 shadow-2xl"
          {...ANIMATION_CONFIG.modal}
          transition={{ ...ANIMATION_CONFIG.transition, type: 'spring', damping: 20 }}
        >
          <motion.h3
            className="text-2xl font-bold text-yellow-400 mb-6 text-center"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, ...ANIMATION_CONFIG.transition }}
          >
            {initialTask ? 'Edit Task' : 'Add New Task'}
          </motion.h3>

          <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Row 1: Task ID and Created On */}
            <div className="col-span-1">
              <FormInput label="Task ID" name="taskID" value={task.taskID} readOnly />
            </div>
            <div className="col-span-1">
              <FormInput label="Created On" name="taskCreatedOn" type="date" value={task.taskCreatedOn} readOnly />
            </div>

            {/* Row 2: Task Name */}
            <div className="col-span-2">
              <FormInput label="Task Name" name="taskName" value={task.taskName} onChange={handleChange} required />
            </div>

            {/* Row 3: Task Info */}
            <div className="col-span-2">
              <FormTextarea label="Task Info" name="taskInfo" value={task.taskInfo} onChange={handleChange} required />
            </div>

            {/* Row 4: Due Date and Priority */}
            <div className="col-span-1">
              <FormInput label="Due Date" name="taskDueDate" type="date" value={task.taskDueDate} onChange={handleChange} required={!initialTask} />
            </div>
            <div className="col-span-1">
              <FormSelect label="Priority" name="taskPriority" value={task.taskPriority} onChange={handleChange} options={priorityOptions} />
            </div>

            {/* Row 5: Assigned To (left) and Access Level (right) */}
            <div className="col-span-1">
              <FormSelect 
                label="Assigned To (Hold Ctrl/Cmd to select multiple)" 
                name="assignedTo" 
                value={task.assignedTo} 
                onChange={handleChange} 
                options={users} 
                multiple 
              />
            </div>
            <div className="col-span-1">
              <FormRadioGroup label="Access Level" name="taskAccessLvl" value={task.taskAccessLvl} onChange={handleChange} options={accessOptions} />
            </div>
          </div>

          {/* Form Actions */}
          <motion.div
            className="flex justify-end space-x-4 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.2, ease: 'easeOut' }}
          >
            <motion.button
              type="submit"
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-medium py-2 px-8 rounded-lg shadow-lg"
              whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(234, 179, 8, 0.5)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              disabled={isLoading}
            >
              Save
            </motion.button>
            <motion.button
              type="button"
              onClick={onClose}
              className="bg-gray-700/80 text-yellow-400 font-medium py-2 px-8 rounded-lg shadow-lg"
              whileHover={{ scale: 1.05, boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              Cancel
            </motion.button>
          </motion.div>
        </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default memo(NewTaskModal);