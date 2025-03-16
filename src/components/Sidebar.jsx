import React from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { IconPlanet, IconLogout } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { auth } from "../pages/api/firebase";
import { signOut } from "firebase/auth";
import { brain, sitemap, screening } from "../assets";

const Icon = React.memo(({ name, imageUrl, isActive, handleClick }) => (
  <div className="relative group">
    <motion.div
      className={`h-12 w-12 rounded-xl flex items-center justify-center ${
        isActive ? "bg-gradient-to-r from-yellow-500 to-yellow-600" : "bg-gray-900"
      }`}
      whileHover={{ scale: 1.05, boxShadow: "0 0 10px rgba(255, 215, 0, 0.5)" }}
      onClick={handleClick}
      transition={{ duration: 0.2 }}
    >
      <img src={imageUrl} alt={`${name} icon`} className="h-6 w-6" />
    </motion.div>
    <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded border border-yellow-500/50 shadow-[0_0_5px_rgba(255,215,0,0.3)] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {name}
    </span>
  </div>
));

const Sidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navItems = [
    { name: "Navigator", imageUrl: brain, path: "/Navigator" },
    { name: "Galaxy", imageUrl: sitemap, path: "/Mindmap" },
    { name: "Personnel", imageUrl: screening, path: "/Table" },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="fixed top-0 left-0 h-screen w-20 flex flex-col items-center justify-center gap-6">
      {/* Home */}
      <Link to="/Welcome" aria-label="Home">
        <motion.div
          className="rounded-xl bg-gray-900 p-3 shadow-[0_0_10px_rgba(255,215,0,0.3)]"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <IconPlanet size={32} color="#FFD700" />
        </motion.div>
      </Link>

      {/* Navigation */}
      <div className="flex flex-col items-center gap-4 bg-gray-900 py-6 px-2 rounded-2xl border border-yellow-500/20 shadow-lg">
        {navItems.map((item) => (
          <Icon
            key={item.name}
            name={item.name}
            imageUrl={item.imageUrl}
            isActive={item.path === pathname}
            handleClick={() => navigate(item.path)}
          />
        ))}
      </div>

      {/* Logout */}
      <motion.div
        className="rounded-xl bg-gray-900 p-3 shadow-[0_0_10px_rgba(255,215,0,0.3)] cursor-pointer"
        whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(255, 215, 0, 0.5)" }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLogout}
        transition={{ duration: 0.2 }}
        aria-label="Logout"
      >
        <IconLogout size={32} color="#FFD700" />
      </motion.div>
    </div>
  );
};

export default React.memo(Sidebar);