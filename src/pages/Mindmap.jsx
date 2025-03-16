import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Typewriter } from "react-simple-typewriter";
import { GoogleGenerativeAI } from "@google/generative-ai";
import emailjs from "@emailjs/browser";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./api/firebase";
import { dead_planet, dead_planet3, dead_planet2, rei, usericon, logo } from "../assets";
import axios from 'axios';

const EMAIL_SERVICE_ID = "service_453mbog";
const EMAIL_TEMPLATE_ID = "template_pgv128f";
const EMAIL_PUBLIC_KEY = "BrLIGVtq4f2f_eb0-";

// Color scheme
const colors = {
  background: "#13131A",
  sunsetGold: "#FFB81C",
  solarFlare: "#FF5A36",
  daylightBlue: "#3C9DC6",
  solarWhite: "#F8F8F8",
  astroGray: "#5A5A5A",
  lunarBlack: "#1A1A1A"
};

const genAI = new GoogleGenerativeAI("AIzaSyAShHKdWlGWeUqva5MBzHA-avwJb95YgM4");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Planet data
const planetImages = [dead_planet, dead_planet2, dead_planet3];

const getRandomPlanet = () => {
  return planetImages[Math.floor(Math.random() * planetImages.length)];
};

const MindMapNode = ({ node, isRoot = false, onSelect }) => {
  const childCount = node.children?.length || 0;
  const nodesPerRing = 4;

  const getChildPosition = (index) => {
    const ringIndex = Math.floor(index / nodesPerRing);
    const positionInRing = index % nodesPerRing;
    const rx = 190 + ringIndex * 270;
    const ry = 160 + ringIndex * 100;
    const isOddRing = ringIndex % 2 === 1;
    const baseAngle = isOddRing ? Math.PI / 4 : 0;
    const angleStep = (2 * Math.PI) / nodesPerRing;
    const angle = baseAngle + positionInRing * angleStep;

    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;

    return { x, y };
  };

  const childPositions = useMemo(() => {
    return node.children?.map((_, index) => getChildPosition(index)) || [];
  }, [node.children?.length]);

  return (
    <div className="relative">
      <div
        className="flex items-center justify-center rounded-full shadow-lg text-center z-10"
        style={{
          backgroundColor: colors.sunsetGold,
          color: colors.lunarBlack,
          width: "8rem",
          height: "8rem",
          boxShadow: `0 0 40px 15px ${colors.sunsetGold}90`
        }}
      >
        <span className="px-2 font-semibold">{node.label}</span>
      </div>

      {node.children?.length > 0 && (
        <>
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: '800px', height: '800px', overflow: 'visible', zIndex: 0 }}
          >
            {childPositions.map((pos, index) => (
              <ellipse
                key={`ring-${index}`}
                cx="400"
                cy="400"
                rx={190 + Math.floor(index / nodesPerRing) * 270}
                ry={160 + Math.floor(index / nodesPerRing) * 100}
                stroke={colors.astroGray}
                strokeWidth="2"
                fill="none"
                opacity="0.7"
              />
            ))}
          </svg>

          {node.children.map((child, index) => {
            const position = childPositions[index];
            return (
              <div
                key={child.id}
                className="absolute top-1/2 left-1/2 z-10 cursor-pointer"
                style={{ transform: `translate(${position.x}px, ${position.y}px) translate(-50%, -50%)` }}
                onClick={(e) => onSelect(child, position)}
              >
                <div className="relative">
                  <motion.div
                    className="flex items-center justify-center rounded-full overflow-visible"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 40 + index * 7,
                      ease: "linear",
                      repeat: Infinity
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: "6rem",
                        height: "6rem",
                        boxShadow: `0 0 10px 5px ${child.status === "completed" ? "green" : child.priority === "Medium" ? colors.sunsetGold : child.priority === "Urgent" ? "#FF6347" : colors.daylightBlue}`
                      }}
                    >
                      <img src={child.image} className="w-full h-full object-cover" />
                    </div>
                  </motion.div>
                  {(child.status === "chosen" || child.status === "completed") && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none">
                      {child.assignedTo.length > 0 && (
                        <div className="flex">
                          {child.assignedTo.map((emp, index) => (
                            emp.profilePicture && (
                              <div
                                key={index}
                                className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 border-2"
                                style={{ borderColor: colors.lunarBlack }}
                              >
                                <img src={emp.profilePicture} alt="User" className="w-full h-full object-cover" />
                              </div>
                            )
                          ))}
                        </div>
                      )}
                      <span className="text-xs mt-1 px-2 py-1 rounded-lg bg-opacity-50" style={{ backgroundColor: colors.lunarBlack }}>{child.assignedTo.map(emp => emp.name).join(", ")}</span>
                    </div>
                  )}
                  <div
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center"
                    style={{ color: colors.solarWhite, width: "300px" }}
                  >
                    <span className="text-sm">
                      <Typewriter words={[child.label]} typeSpeed={50} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

const ScheduleMeeting = ({ planet, onClose, onScheduled }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedRoom, setSelectedRoom] = useState("Conference Room A");
  const [meetingTitle, setMeetingTitle] = useState(`Meeting about: ${planet.label}`);
  const [meetingDescription, setMeetingDescription] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleScheduleMeeting = async () => {
    setIsScheduling(true);
    const formattedDate = formatDate(selectedDate);
    const dateTimeString = `${formattedDate} at ${selectedTime}`;
    
    const meetingDetails = {
      title: meetingTitle,
      date: formattedDate,
      time: selectedTime,
      location: selectedRoom,
      description: meetingDescription || `Discussion about task: ${planet.label}`,
      attendees: planet.assignedTo.map(emp => emp.name).join(", ")
    };
    
    const promptForEmail = `
      Write a professional email talking to ${meetingDetails.attendees} about ${meetingDetails.description} at ${dateTimeString}:
      Make the email concise, professional, and flow well. 
      Do not include any salutation or signature, just the body text.
    `;
    
    await handleGenerateEmailContent(promptForEmail);
    setIsScheduling(false);
    onScheduled(`Meeting scheduled for ${dateTimeString}`);
  };

  return (
    <div className="border border-blue-400 p-6 rounded mb-4 bg-opacity-30" style={{ backgroundColor: colors.lunarBlack }}>
      <div className="mb-4">
        <label className="block text-blue-300 mb-2">Meeting Title:</label>
        <input
          type="text"
          className="w-full p-2 text-blue-400 border border-blue-500 rounded"
          style={{ backgroundColor: colors.lunarBlack }}
          value={meetingTitle}
          onChange={(e) => setMeetingTitle(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className="block text-blue-300 mb-2">Date:</label>
        <input
          type="date"
          className="w-full p-2 text-blue-400 border border-blue-500 rounded"
          style={{ backgroundColor: colors.lunarBlack }}
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
      <div className="mb-4">
        <label className="block text-blue-300 mb-2">Time:</label>
        <input
          type="time"
          className="w-full p-2 text-blue-400 border border-blue-500 rounded"
          style={{ backgroundColor: colors.lunarBlack }}
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className="block text-blue-300 mb-2">Meeting Description:</label>
        <textarea
          rows="3"
          className="w-full p-2 text-blue-400 border border-blue-500 rounded"
          style={{ backgroundColor: colors.lunarBlack }}
          placeholder="Enter meeting agenda or details..."
          value={meetingDescription}
          onChange={(e) => setMeetingDescription(e.target.value)}
        />
      </div>
      <div className="mb-6 border border-blue-500 rounded p-3">
        <p className="text-blue-300 mb-2">Attendees:</p>
        <div className="flex flex-wrap gap-2">
          {planet.assignedTo.map((emp, index) => (
            <div key={index} className="flex items-center bg-blue-900 rounded-full pl-1 pr-3 py-1">
              {emp.profilePicture && (
                <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                  <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                </div>
              )}
              <span>{emp.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button
          className="px-4 py-2 bg-blue-500 text-black font-bold rounded hover:bg-blue-600 transition mr-2"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-black font-bold rounded hover:bg-blue-600 transition"
          onClick={handleScheduleMeeting}
          disabled={isScheduling || planet.assignedTo.length === 0}
        >
          {isScheduling ? "Scheduling..." : "Schedule Meeting"}
        </button>
      </div>
    </div>
  );
};

const SolarSystemMindMap = () => {
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const [displayedInfo, setDisplayedInfo] = useState("");
  const [userInput, setUserInput] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailPrompt, setEmailPrompt] = useState("");
  const [discordPrompt, setDiscordPrompt] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showDiscordPromptEditor, setShowDiscordPromptEditor] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDiscord, setShowDiscord] = useState(false);
  const [employees, setEmployees] = useState({});

  const updateTaskInFirebase = async (taskId, assignedEmployees) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        assignedTo: assignedEmployees,
        status: "chosen"
      });
      console.log("Task successfully updated in Firebase");
    } catch (error) {
      console.error("Error updating task in Firebase:", error);
    }
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeesCollection = collection(db, "users");
        const employeesSnapshot = await getDocs(employeesCollection);
        const employeesList = employeesSnapshot.docs.map((doc) => {
          const empData = doc.data();
          return {
            id: empData.empID,
            name: empData.empName,
            email: empData.empEmail,
            profilePicture: empData.empProfilePic || usericon, // Fetch empProfilePic, fallback to usericon
            role: empData.empRole,
            accessLevel: empData.empAccessLvl,
            color: empData.empColor,
            progress: empData.empProgress,
            finished: empData.empFinished,
            assigned: empData.empAssigned,
          };
        });

        const employeesObject = employeesList.reduce((acc, emp) => {
          acc[emp.id] = emp;
          return acc;
        }, {});

        setEmployees(employeesObject);
      } catch (error) {
        console.error("Error fetching employees from Firebase:", error);
      }
    };

    fetchEmployees();
  }, []);

  const [mindMapData, setMindmapData] = useState({
    id: "root",
    label: "",
    children: [],
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksCollection = collection(db, "tasks");
        const tasksSnapshot = await getDocs(tasksCollection);
        const tasksList = tasksSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (tasksList.length > 0) {
          const mappedTasks = tasksList.map((task) => ({
            id: task.id,
            label: task.taskName,
            image: getRandomPlanet(),
            info: task.taskInfo,
            status: task.status || "new",
            assignedTo: Array.isArray(task.assignedTo)
              ? task.assignedTo.map(emp => ({
                  ...emp,
                  profilePicture: employees[emp.id]?.profilePicture || usericon // Map profile picture from employees
                }))
              : [],
            priority: task.taskPriority || "Low",
            dueDate: task.taskDueDate || "",
          }));

          setMindmapData((prev) => ({
            ...prev,
            label: "Project on Astrology",
            children: mappedTasks,
          }));
        }
      } catch (error) {
        console.error("Error fetching tasks from Firebase:", error);
      }
    };

    fetchTasks();
  }, [employees]); // Depend on employees to ensure profile pics are available

  const [currentUser, setCurrentUser] = useState({
    name: "Rei",
    role: "manager"
  });

  let completedTasksCount = mindMapData.children.filter(child => {
    
    return child.status === "completed";
  }).length;
  console.log(completedTasksCount)

  let chosenTasksCount = mindMapData.children.filter(child => {
    
    return child.status === "chosen";
  }).length;
  console.log(chosenTasksCount)
  let totalTasksCount = mindMapData.children.filter(child => {
   
    return true;
  }).length;
  console.log(totalTasksCount)

  const handleTextChange = (event) => {
    setUserInput(event.target.value);
  };

  const handleClosePanel = () => {
    setDisplayedInfo(selectedPlanet?.info || "");
    setSelectedPlanet(null);
    setShowDiscord(false);
    setShowDiscordPromptEditor(false);
    setShowCalendar(false);
    setShowPromptEditor(false);
    setEmailContent("");
    setEmailPrompt("");
    const alertDropdown = document.getElementById("alert-dropdown");
    if (alertDropdown) alertDropdown.value = "none";
  };

  const handleSelectPlanet = (planet, position) => {
    setSelectedPlanet(planet);
    setPanelPosition({ top: `calc(50% + ${position.y}px)`, left: `calc(50% + ${position.x + 100}px)` });
  };

  const [totalCompleted, setTotalCompleted] = useState(completedTasksCount + "/" + totalTasksCount);
  const [totalChosen, setTotalChosen] = useState(chosenTasksCount + "/" + totalTasksCount);

  useEffect(() => {
    emailjs.init(EMAIL_PUBLIC_KEY);
  }, []);

  const [emailSending, setEmailSending] = useState(false);
  const [discordSending, setDiscordSending] = useState(false);
  const [messageContent, setMessageContent] = useState("");

  const handleSendMessage = async () => {
    setDisplayedInfo(`Discord successfully sent!`);
    setDiscordSending(true);

    const discordWebhookUrl = 'https://discord.com/api/webhooks/1350395288875171921/G9qINIeGWtzZhYDHPMj4_ogxzvdhJujcERb0aIzNo_UDEuFWVKn5bPi5niaguqwNRg-l';
    const message = { content: messageContent };

    try {
      await axios.post(discordWebhookUrl, message);
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
    }

    setDiscordSending(false);
    setShowDiscord(false);
    setShowDiscordPromptEditor(false);
  };

  const handleGenerateEmailContent = async (customPrompt) => {
    try {
      setEmailPrompt("Loading...");
      const result = await model.generateContent("Don't add any bolded characters, now do this for me: " + customPrompt);
      const generatedContent = result.response.text();
      setEmailContent(generatedContent);
      setShowPromptEditor(false);
      setShowCalendar(false);
    } catch (error) {
      console.error("Error generating email:", error);
      setDisplayedInfo("Error generating email content. Please try again.");
    }
  };

  const handleGenerateDiscordMessage = async (customPrompt) => {
    setMessageContent("Loading...");
    setShowDiscordPromptEditor(false);
    setShowDiscord(true);
    try {
      const result = await model.generateContent("Don't add any bolded characters, now do this for me: " + customPrompt);
      const generatedContent = result.response.text();
      setMessageContent(generatedContent);
    } catch (error) {
      console.error("Error generating Discord message:", error);
      setMessageContent("Failed to generate message. Please try again.");
    }
  };

  const handleSendEmail = async () => {
    console.log("Email sending started");  // Add this to check if the function runs
    setEmailSending(true);
    try {
      // Extract email addresses from the assignedTo array
      const emailAddresses = selectedPlanet.assignedTo
        .map(emp => emp.email)
        .filter(email => email);  // Filter out any undefined emails
      
      console.log("Email addresses:", emailAddresses);  // Check what emails are found
      
      if (emailAddresses.length === 0) {
        throw new Error("No valid email addresses found");
      }
      
      const templateParams = {
        to_name: selectedPlanet.assignedTo.map(emp => emp.name).join(", "),
        to_email: emailAddresses.join(", "),
        subject: `Task Update: ${selectedPlanet.label}`,
        message: emailContent,
        task_name: selectedPlanet.label,
        task_description: selectedPlanet.info
      };
      
      console.log("Sending with params:", templateParams);
      
      const response = await emailjs.send(
        EMAIL_SERVICE_ID,
        EMAIL_TEMPLATE_ID,
        templateParams,
        EMAIL_PUBLIC_KEY
      );
      
      console.log("Email sent successfully:", response);
      setEmailSending(false);
      setEmailContent("");
      setShowPromptEditor(false);
      setDisplayedInfo(`Email successfully sent to ${selectedPlanet.assignedTo.map(emp => emp.name).join(", ")}`);
    } catch (error) {
      console.error("Error sending email:", error);
      setEmailSending(false);
      setDisplayedInfo(`Error sending email: ${error.message}. Please try again.`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
      <h1 className="text-3xl font-bold mb-12 z-10" style={{ color: colors.solarWhite }}></h1>

      <div className="relative z-10" style={{ width: '800px', height: '800px' }}>
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ top: '45%', left: '45%' }}
        >
          {currentUser.role === "employee" ? (
            <MindMapNode
              node={{
                ...mindMapData,
                children: mindMapData.children.filter(task =>
                  task.assignedTo.some(emp => emp.name === currentUser.name) &&
                  (task.status === "chosen" || task.status === "completed")
                )
              }}
              isRoot={true}
              onSelect={handleSelectPlanet}
            />
          ) : (
            <MindMapNode
              node={mindMapData}
              isRoot={true}
              onSelect={handleSelectPlanet}
            />
          )}
        </div>
      </div>

      <div
        className="fixed right-6 top-4 flex items-center justify-center z-10"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-opacity-90 p-6 rounded-lg shadow-lg text-green-400 w-[200px] border-4 border-green-500 font-mono"
          style={{ backgroundColor: colors.lunarBlack }}
        >
          <h2 className="text-xl font-bold mb-4 text-center border-b border-green-500 pb-2">
            Task Priority
          </h2>
          <div className="border border-green-400 p-4 rounded mb-4">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "green", marginRight: '8px' }} />
              <span>Completed</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors.sunsetGold, marginRight: '8px' }} />
              <span>Medium</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors.daylightBlue, marginRight: '8px' }} />
              <span>Low</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#FF6347", marginRight: '8px' }} />
              <span>Urgent</span>
            </div>
          </div>
          <div className="border-t border-green-500 pt-4">
            <div className="flex justify-between font-medium">
              <span>Completed:</span>
              <span>{completedTasksCount + "/" + totalTasksCount}</span>
            </div>
            <div className="flex justify-between font-medium mt-2">
              <span>Chosen:</span>
              <span>{chosenTasksCount + "/" + totalTasksCount}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {selectedPlanet && selectedPlanet.status === "chosen" && (
        <div
          className="fixed inset-0 flex items-center justify-center z-20"
          style={{ transform: 'translateX(40px)' }}
          onClick={handleClosePanel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-opacity-90 p-10 rounded-lg shadow-lg text-green-400 w-[60%] max-w-3xl border-4 border-green-500 font-mono"
            style={{ backgroundColor: colors.lunarBlack }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-4xl font-bold mb-6 text-center border-b border-green-500 pb-4">
              {selectedPlanet.label}
            </h2>

            {currentUser.role === "manager" && (
              <div className="mb-6">
                <label htmlFor="alert-dropdown" className="block text-lg font-semibold text-green-300">
                  Alert:
                </label>
                <select
                  id="alert-dropdown"
                  className="mt-2 p-2 text-green-400 border border-green-500 rounded"
                  style={{ backgroundColor: colors.lunarBlack }}
                  onChange={(e) => {
                    if (e.target.value === "email") {
                      setShowPromptEditor(true);
                      setShowCalendar(false);
                      setShowDiscord(false);
                      setShowDiscordPromptEditor(false);
                      setEmailPrompt(`Write a professional email to ${selectedPlanet.assignedTo.map(emp => emp.name).join(", ")} about the following task: "${selectedPlanet.label}". 
                        Include these details: 
                        Task description: ${selectedPlanet.info}. 
                        Make the email concise, professional, and include a call to action. 
                        Do not include any salutation or signature, just the body text.`.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
                    } else if (e.target.value === "calendar") {
                      setShowPromptEditor(false);
                      setEmailContent("");
                      setEmailPrompt("");
                      setShowCalendar(true);
                      setShowDiscord(false);
                      setShowDiscordPromptEditor(false);
                    } else if (e.target.value === "discord") {
                      setShowPromptEditor(false);
                      setEmailContent("");
                      setEmailPrompt("");
                      setDiscordPrompt(`Write a brief Discord message about task "${selectedPlanet.label}" that's due on ${selectedPlanet.dueDate}. 
                        Mention that it's assigned to ${selectedPlanet.assignedTo.map(emp => emp.name).join(", ")}. 
                        Include a brief description of the task: ${selectedPlanet.info}.
                        Make it casual and friendly with 1-2 emojis. Keep it under 5 sentences.`.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
                      setShowDiscordPromptEditor(true);
                      setShowCalendar(false);
                    } else {
                      setShowCalendar(false);
                      setShowDiscord(false);
                      setShowPromptEditor(false);
                      setEmailContent("");
                      setEmailPrompt("");
                      setShowDiscordPromptEditor(false);
                    }
                  }}
                >
                  <option value="none">None</option>
                  <option value="discord">Discord</option>
                  <option value="email">Email</option>
                  <option value="calendar">Schedule</option>
                </select>
              </div>
            )}

            {showPromptEditor && (
              <div className="border border-blue-400 p-6 rounded mb-4 bg-opacity-30" style={{ backgroundColor: colors.lunarBlack }}>
                <h3 className="text-lg font-bold text-blue-300 mb-2">Customize Email Generation:</h3>
                <textarea
                  rows="4"
                  className="w-full p-4 text-blue-400 border border-blue-500 rounded mt-2"
                  style={{ backgroundColor: colors.lunarBlack }}
                  placeholder="Enter custom prompt for email generation..."
                  value={emailPrompt}
                  onChange={(e) => setEmailPrompt(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button
                    className="px-4 py-2 bg-blue-500 text-black font-bold rounded hover:bg-blue-600 transition"
                    onClick={() => handleGenerateEmailContent(emailPrompt)}
                  >
                    Generate Email
                  </button>
                </div>
              </div>
            )}

            {showCalendar && (
              <ScheduleMeeting
                planet={selectedPlanet}
                onClose={() => {
                  setShowCalendar(false);
                  const alertDropdown = document.getElementById("alert-dropdown");
                  if (alertDropdown) alertDropdown.value = "none";
                }}
                onScheduled={(message) => {
                  setDisplayedInfo(message);
                  setShowCalendar(false);
                }}
              />
            )}

            {showDiscord && (
              <div className="border border-blue-400 p-6 rounded mb-4 bg-opacity-30" style={{ backgroundColor: colors.lunarBlack }}>
                <h3 className="text-lg font-bold text-blue-300 mb-2">Discord Message</h3>
                <div className="mb-4 p-2 rounded bg-blue-400 bg-opacity-20">
                  <p className="text-blue-300"><span className="font-bold">Task:</span> {selectedPlanet.label}</p>
                  <p className="text-blue-300"><span className="font-bold">Assigned to:</span> {selectedPlanet.assignedTo.map(emp => emp.name).join(", ")}</p>
                  <p className="text-blue-300"><span className="font-bold">Due date:</span> {selectedPlanet.dueDate}</p>
                </div>
                <div className="border p-4 rounded mb-4" style={{ backgroundColor: '#36393f', borderColor: '#7289DA' }}>
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-400 mr-2"></div>
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium text-white">Horizen</span>
                        <span className="text-xs text-gray-400 ml-2">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <textarea
                    rows="5"
                    className="w-full p-3 rounded text-white"
                    style={{ backgroundColor: '#40444b', border: 'none' }}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Your message will appear here after generation..."
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 bg-blue-500 text-black font-bold rounded hover:bg-blue-600 transition mr-2"
                    onClick={() => {
                      setShowDiscord(false);
                      setMessageContent("");
                      const alertDropdown = document.getElementById("alert-dropdown");
                      if (alertDropdown) alertDropdown.value = "none";
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-500 text-black font-bold rounded hover:bg-blue-600 transition"
                    onClick={handleSendMessage}
                    disabled={discordSending}
                  >
                    {discordSending ? "Sending..." : "Send Discord"}
                  </button>
                </div>
              </div>
            )}

            {showDiscordPromptEditor && (
              <div className="border border-blue-400 p-6 rounded mb-4 bg-opacity-30" style={{ backgroundColor: colors.lunarBlack }}>
                <h3 className="text-lg font-bold text-blue-300 mb-2">Customize Discord Message Generation:</h3>
                <textarea
                  rows="4"
                  className="w-full p-4 text-blue-400 border border-blue-500 rounded mt-2"
                  style={{ backgroundColor: colors.lunarBlack }}
                  placeholder="Enter custom prompt for Discord Message generation..."
                  value={discordPrompt}
                  onChange={(e) => setDiscordPrompt(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button
                    className="px-4 py-2 bg-blue-500 text-black font-bold rounded hover:bg-blue-600 transition"
                    onClick={() => handleGenerateDiscordMessage(discordPrompt)}
                  >
                    Generate Discord
                  </button>
                </div>
              </div>
            )}

            {emailContent && (
              <div className="border border-yellow-400 p-6 rounded mb-4 bg-opacity-30" style={{ backgroundColor: colors.lunarBlack }}>
                <h3 className="text-lg font-bold text-yellow-300 mb-2">Email Preview:</h3>
                <div className="mb-4">
                  <p className="text-yellow-200"><span className="font-bold">To:</span> {selectedPlanet.assignedTo.map(emp => emp.name).join(", ")}</p>
                  <p className="text-yellow-200"><span className="font-bold">Subject:</span> Task Update: {selectedPlanet.label}</p>
                </div>
                <div className="border-t border-yellow-500 pt-3">
                  <textarea
                    rows="8"
                    className="w-full p-4 text-yellow-200 border border-yellow-500 rounded mt-2"
                    style={{ backgroundColor: colors.lunarBlack }}
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Email content..."
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    className="px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-600 transition mr-2"
                    onClick={() => {
                      setShowPromptEditor(false);
                      setEmailContent("");
                      setEmailPrompt("");
                      const alertDropdown = document.getElementById("alert-dropdown");
                      if (alertDropdown) alertDropdown.value = "none";
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-600 transition"
                    onClick={() => {
                      console.log("Email button clicked");  // Add this to debug
                      handleSendEmail();  // Call without parameters
                    }}
                    disabled={emailSending}
                    >
                    {emailSending ? "Sending..." : "Send Email"}
                    </button>
                </div>
              </div>
            )}

            {!emailContent && !showPromptEditor && !showCalendar && !showDiscord && !showDiscordPromptEditor && (
              <label className="block text-lg font-semibold text-green-300 mb-2">
                Due Date: {selectedPlanet.dueDate}
              </label>
            )}

            {!emailContent && !showPromptEditor && !showCalendar && !showDiscord && !showDiscordPromptEditor && (
              <div className="border border-green-400 p-6 rounded mb-8">
                {selectedPlanet.info}
              </div>
            )}

            {currentUser.role === "employee" && selectedPlanet.status === "chosen" && (
              <div className="flex justify-center mt-4">
                <button
                  className="px-6 py-3 bg-green-500 text-black font-bold rounded hover:bg-green-600 transition"
                  onClick={() => {
                    const updatedMindmapData = {
                      ...mindMapData,
                      children: mindMapData.children.map((planet) => {
                        if (planet.id === selectedPlanet.id) {
                          try {
                            const taskRef = doc(db, "tasks", planet.id);
                            updateDoc(taskRef, {
                              status: "completed",
                              priority: "Completed"
                            });
                          } catch (error) {
                            console.error("Error updating task status:", error);
                          }
                          return { ...planet, status: "completed", priority: "Completed" };
                        }
                        return planet;
                      })
                    };
                    setMindmapData(updatedMindmapData);
                    
                    setSelectedPlanet(null);
                  }}
                >
                  Mark as Completed
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {selectedPlanet && selectedPlanet.status === "new" && (
        <div
          className="fixed inset-0 flex items-center justify-center z-20"
          style={{ transform: 'translateX(40px)' }}
          onClick={() => setSelectedPlanet(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-opacity-90 p-10 rounded-lg shadow-lg text-green-400 w-[50%] max-w-2xl border-4 border-green-500 font-mono"
            style={{ backgroundColor: colors.lunarBlack }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-4xl font-bold mb-6 text-center border-b border-green-500 pb-4">
              {selectedPlanet.label}
            </h2>
            <label className="block text-lg font-semibold text-green-300 mb-2">
              Due Date: {selectedPlanet.dueDate}
            </label>
            <div className="border border-green-400 p-6 rounded mb-4">
              <p className="text-green-300 text-center">{selectedPlanet.info}</p>
            </div>
            <div className="mb-6">
              <label className="block text-lg font-semibold text-green-300 mb-2">
                Assign Employees:
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-3 text-green-400 border border-green-500 rounded"
                  style={{ backgroundColor: colors.lunarBlack }}
                  placeholder="Type to search employees..."
                  value={userInput}
                  onChange={handleTextChange}
                />
                {userInput.length > 0 && (
                  <div
                    className="absolute left-0 right-0 mt-1 border border-green-500 rounded overflow-y-auto max-h-40 z-30"
                    style={{ backgroundColor: colors.lunarBlack }}
                  >
                    {Object.entries(employees)
                      .filter(([id, emp]) =>
                        emp.name.toLowerCase().includes(userInput.toLowerCase()) &&
                        !selectedPlanet.assignedTo.some(assigned => assigned.name === emp.name)
                      )
                      .map(([id, emp]) => (
                        <div
                          key={id}
                          className="p-2 hover:bg-green-900 cursor-pointer flex items-center"
                          onClick={() => {
                            const updatedAssignedTo = [...selectedPlanet.assignedTo, emp];
                            updateTaskInFirebase(selectedPlanet.id, updatedAssignedTo);
                            const updatedMindmapData = {
                              ...mindMapData,
                              children: mindMapData.children.map((planet) => {
                                if (planet.id === selectedPlanet.id) {
                                  return { ...planet, assignedTo: updatedAssignedTo };
                                }
                                return planet;
                              })
                            };
                            setMindmapData(updatedMindmapData);
                            setSelectedPlanet({
                              ...selectedPlanet,
                              assignedTo: updatedAssignedTo
                            });
                            setUserInput("");
                          }}
                        >
                          {emp.profilePicture && (
                            <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                              <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <span>{emp.name}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            {selectedPlanet.assignedTo.length > 0 && (
              <div className="mb-6 border border-green-500 rounded p-3">
                <p className="text-green-300 mb-2">Assigned Employees:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPlanet.assignedTo.map((emp, index) => (
                    <div key={index} className="flex items-center bg-green-900 rounded-full pl-1 pr-3 py-1">
                      {emp.profilePicture && (
                        <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                          <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="mr-2">{emp.name}</span>
                      <button
                        className="text-xs text-red-300 hover:text-red-500"
                        onClick={() => {
                          const updatedAssignedTo = selectedPlanet.assignedTo.filter((_, i) => i !== index);
                          updateTaskInFirebase(selectedPlanet.id, updatedAssignedTo);
                          const updatedMindmapData = {
                            ...mindMapData,
                            children: mindMapData.children.map((planet) => {
                              if (planet.id === selectedPlanet.id) {
                                return { ...planet, assignedTo: updatedAssignedTo };
                              }
                              return planet;
                            })
                          };
                          setMindmapData(updatedMindmapData);
                          setSelectedPlanet({
                            ...selectedPlanet,
                            assignedTo: updatedAssignedTo
                          });
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-center">
              <button
                className="px-6 py-3 bg-green-500 text-black font-bold rounded hover:bg-green-600 transition"
                onClick={() => {
                  const updatedMindmapData = {
                    ...mindMapData,
                    children: mindMapData.children.map((planet) => {
                      if (planet.id === selectedPlanet.id) {
                        updateTaskInFirebase(planet.id, planet.assignedTo);
                        return { ...planet, status: "chosen" };
                      }
                      return planet;
                    })
                  };
                  setMindmapData(updatedMindmapData);
                  const chosenTasksCount = updatedMindmapData.children.filter(child => child.status === 'chosen').length;
                  setTotalChosen(chosenTasksCount + "/" + totalTasksCount);
                  setSelectedPlanet(null);
                }}
              >
                Assign
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SolarSystemMindMap;
