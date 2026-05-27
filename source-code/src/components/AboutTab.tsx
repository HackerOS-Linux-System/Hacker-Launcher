export default function AboutTab() {
  return (
    <>
      <div className="section-label">About</div>
      <div className="about-text">
{`Hacker Launcher v0.5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A game launcher for running Windows games on Linux
with Proton, Wine, Flatpak, Steam, and Native runners.

Built with:
  • Rust + Tauri (backend)
  • React + TypeScript (frontend)
  • Original Python app by HackerOS

GitHub: https://github.com/HackerOS-Linux-System/Hacker-Launcher

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Features:
  • Add and manage games with multiple runners
  • Install and manage Proton GE / Official versions
  • Per-game DXVK, Esync, Fsync, DXVK-Async options
  • Gamescope integration (--gamescope launch option)
  • Wine prefix management
  • FPS limiting via Gamescope
  • Auto game logging

Data stored in: ~/.hackeros/Hacker-Launcher/
`}
      </div>
    </>
  );
}
