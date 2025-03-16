import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { auth, db } from "./api/firebase"; // Adjust path based on your Firebase config file
import { getDoc, doc } from "firebase/firestore";

const Welcome = () => {
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's name from Firebase
  useEffect(() => {
    const fetchUserName = async () => {
      setIsLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, "user", user.uid));
          if (userDoc.exists()) {
            setUserName(userDoc.data().empName);
          } else {
            console.error("No such document!");
            setUserName("Explorer"); // Fallback name
          }
        } else {
          console.error("No user logged in!");
          setUserName("Explorer"); // Fallback name
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
        setUserName("Explorer"); // Fallback name
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserName();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Welcome message */}
      <motion.h1
        className="text-2xl sm:text-4xl font-bold text-white mb-8 z-10 text-center px-4"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        Welcome back, {isLoading ? "..." : userName}! Ready to conquer your tasks today?
      </motion.h1>

      {/* Animation container */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Planet */}
        <motion.div
          className="w-32 h-32 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 absolute"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Orbiting spaceship */}
        <motion.div
          className="absolute w-full h-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        >
          <motion.div
            className="w-6 h-6 bg-white rounded-full absolute"
            style={{ top: "50%", left: "50%", x: "-50%", y: "-100px" }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;