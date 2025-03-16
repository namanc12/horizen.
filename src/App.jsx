import React, { useEffect, useState, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { auth } from "./pages/api/firebase";
import Sidebar from "./components/Sidebar";
import { Mindmap, WebWorkPage, Guide, Welcome, LoginPage } from "./pages";

const COLORS = Object.freeze({
  background: "#13131A",
  sunsetGold: "#FFB81C",
  solarFlare: "#FF5A36",
  daylightBlue: "#3C9DC6",
  solarWhite: "#F8F8F8",
  astroGray: "#5A5A5A",
  lunarBlack: "#1A1A1A"
});

const STAR_ANIMATIONS = Array.from({ length: 150 }, () => 
  `twinkle ${(Math.random() * 5 + 3).toFixed(2)}s ease-in-out infinite alternate`
);

const StarryBackground = React.memo(() => {
  const stars = useMemo(() => 
    Array.from({ length: 150 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 0.25 + 0.05,
      opacity: Math.random() * 0.7 + 0.3,
      animation: STAR_ANIMATIONS[i],
    })),
    []
  );

  return (
    <div className="fixed inset-0 starry-background" style={{ backgroundColor: COLORS.background, zIndex: -10 }}>
      {stars.map((star, index) => (
        <div
          key={index}
          className="absolute rounded-full star"
          style={{
            backgroundColor: COLORS.solarWhite,
            width: `${star.size}vh`,
            height: `${star.size}vh`,
            left: `${star.x}%`,
            top: `${star.y}%`,
            opacity: star.opacity,
            boxShadow: `0 0 ${star.size * 3}px ${star.size}px rgba(255, 255, 255, 0.8)`,
            animation: star.animation,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
});

StarryBackground.displayName = 'StarryBackground';

const ProtectedRoute = ({ user, isLoading, children }) => {
  if (isLoading) {
    return <div>Loading...</div>; 
  }
  return user ? children : <Navigate to="/Login" />;
};

const AppRoutes = ({ user, isLoading }) => (
  <Routes>
    <Route path="/Login" element={<LoginPage />} />
    <Route
      path="/Welcome"
      element={
        <ProtectedRoute user={user} isLoading={isLoading}>
          <Welcome />
        </ProtectedRoute>
      }
    />
    <Route
      path="/Navigator"
      element={
        <ProtectedRoute user={user} isLoading={isLoading}>
          <Guide />
        </ProtectedRoute>
      }
    />
    <Route
      path="/Mindmap"
      element={
        <ProtectedRoute user={user} isLoading={isLoading}>
          <Mindmap />
        </ProtectedRoute>
      }
    />
    <Route
      path="/Table"
      element={
        <ProtectedRoute user={user} isLoading={isLoading}>
          <WebWorkPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to={user ? "/Welcome" : "/Login"} />} />
  </Routes>
);

const MemoizedSidebar = React.memo(Sidebar);

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      auth.signOut();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative flex min-h-screen p-4">
      <StarryBackground style={{ display: location.pathname === "/Login" ? "none" : "block" }} />
      
      {user && (
        <div className="hidden sm:block mr-10 shrink-0" style={{ zIndex: 10 }} key={user?.uid}>
          <MemoizedSidebar />
        </div>
      )}
      
      <main className="flex-1 max-w-[1280px] mx-auto sm:pr-5" style={{ zIndex: 1 }}>
        <AppRoutes user={user} isLoading={isLoading} />
      </main>
    </div>
  );
};

export default React.memo(App);
