import React, { useState } from "react";
import { ParticleBackground } from "./components/ParticleBackground";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";

function App() {
  const [view, setView] = useState("landing");
  const [settings, setSettings] = useState(null);

  const handleStart = (config) => {
    setSettings(config);
    setView("dashboard");
  };

  return (
    <div className="relative min-h-screen text-gray-100 selection:bg-purple-500/30 selection:text-white">
      {/* Floating ambient orbs — purely decorative */}
      <div className="orb orb-purple" aria-hidden="true" />
      <div className="orb orb-cyan"   aria-hidden="true" />
      <div className="orb orb-pink"   aria-hidden="true" />

      {/* Particle canvas behind everything */}
      <ParticleBackground />

      {/* Page Content */}
      <main className="relative flex flex-col justify-center items-center w-full min-h-screen z-10">
        {view === "landing" ? (
          <LandingPage onStart={handleStart} />
        ) : (
          <Dashboard initialSettings={settings} onBack={() => setView("landing")} />
        )}
      </main>
    </div>
  );
}

export default App;
