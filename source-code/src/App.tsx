import { useState, useCallback } from "react";
import GamesTab from "./components/GamesTab";
import ProtonsTab from "./components/ProtonsTab";
import SettingsTab from "./components/SettingsTab";
import AboutTab from "./components/AboutTab";
import ToastContainer from "./components/ToastContainer";
import { Toast } from "./types";

type Tab = "Games" | "Protons" | "Settings" | "About";
const TABS: Tab[] = ["Games", "Protons", "Settings", "About"];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Games");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, kind: Toast["kind"] = "info") => {
      const id = Date.now();
      setToasts((t) => [...t, { id, message, kind }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    },
    []
  );

  return (
    <div className="app">
      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="tab-content">
        {activeTab === "Games" && <GamesTab addToast={addToast} />}
        {activeTab === "Protons" && <ProtonsTab addToast={addToast} />}
        {activeTab === "Settings" && <SettingsTab addToast={addToast} />}
        {activeTab === "About" && <AboutTab />}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
