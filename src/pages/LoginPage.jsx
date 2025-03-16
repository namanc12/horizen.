import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./api/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import spaceBg from "../assets/space-bg.webp";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();

  // Handle mount animation and scroll for parallax
  useEffect(() => {
    setIsAnimating(true);
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/Welcome");
    } catch (error) {
      setError("Failed to log in. Please check your credentials.");
      console.error("Login error:", error);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto text-white">
      {/* Parallax Background */}
      <div 
        className="absolute inset-0 bg-black/40 animate-pulse opacity-20 z-0"
        style={{
          backgroundImage: `url(${spaceBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          transform: `translateY(${scrollY * 0.3}px)`,
          willChange: "transform",
        }}
      />

      {/* Login Form Container */}
      <div className="min-h-screen flex items-center justify-center">
        <div 
          className={`relative z-10 bg-[#1A1A1A]/95 p-8 rounded-xl border border-[#FFB81C]/50 shadow-2xl w-full max-w-md transform transition-all duration-500 ease-out ${
            isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <h1 className="text-3xl font-bold text-[#FFB81C] mb-6 text-center animate-fade-in">
            horizen.
          </h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 animate-fade-in" style={{animationDelay: '0.1s'}}>
              <label className="block text-sm font-medium text-[#FFB81C]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-[#13131A] text-white rounded-lg border border-[#FFB81C]/50 focus:outline-none focus:ring-2 focus:ring-[#FFB81C] transition-all duration-200 hover:border-[#FFB81C] focus:scale-[1.01]"
                required
              />
            </div>
            <div className="space-y-2 animate-fade-in" style={{animationDelay: '0.2s'}}>
              <label className="block text-sm font-medium text-[#FFB81C]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-[#13131A] text-white rounded-lg border border-[#FFB81C]/50 focus:outline-none focus:ring-2 focus:ring-[#FFB81C] transition-all duration-200 hover:border-[#FFB81C] focus:scale-[1.01]"
                required
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm animate-shake">{error}</p>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#FFB81C] to-[#FF5A36] text-black font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 animate-fade-in"
              style={{animationDelay: '0.3s'}}
            >
              Log In
            </button>
          </form>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;