import React, { useState, useEffect, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { auth, db } from "./api/firebase";
import { getDoc, doc } from "firebase/firestore";

const welcomeTextVariants = {
  hidden: { opacity: 0, y: -50 },
  visible: { opacity: 1, y: 0, transition: { duration: 1 } },
};

const planetVariants = {
  animate: { scale: [1, 1.1, 1], transition: { duration: 8, repeat: Infinity, ease: "easeInOut" } },
};

const orbitVariants = {
  animate: { rotate: 360, transition: { duration: 16, repeat: Infinity, ease: "linear" } },
};

const Welcome = memo(() => {
  const [userName, setUserName] = useState("Explorer");
  const [isLoading, setIsLoading] = useState(true);

  // Memoized
  const fetchUserName = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No user logged in!");
        return;
      }

      const userDocRef = doc(db, "user", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUserName(userDoc.data().empName || "Explorer");
      } else {
        console.error("No such document!");
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserName();
  }, [fetchUserName]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <motion.h1
        className="text-2xl sm:text-4xl font-bold text-white mb-8 z-10 text-center px-4"
        variants={welcomeTextVariants}
        initial="hidden"
        animate="visible"
      >
        Welcome back, {isLoading ? "..." : userName}! Ready to conquer your tasks today?
      </motion.h1>

      {/* Breathing Animation */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        <motion.div
          className="w-32 h-32 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 absolute"
          variants={planetVariants}
          animate="animate"
        />
        <motion.div
          className="absolute w-full h-full"
          variants={orbitVariants}
          animate="animate"
        >
          <motion.div
            className="w-6 h-6 bg-white rounded-full absolute"
            style={{ top: "50%", left: "50%", translateX: "-50%", translateY: "-100px" }}
          />
        </motion.div>
      </div>
    </div>
  );
});

Welcome.displayName = "Welcome";

export default Welcome;
