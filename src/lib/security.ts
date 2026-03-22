/**
 * Client-side security hardening.
 * Disables DevTools, right-click inspect, and common pentest shortcuts.
 * Note: These are deterrents, not foolproof protections.
 */

export function initSecurityGuard() {
  // Disable right-click context menu globally
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  // Block common DevTools keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // F12
    if (e.key === "F12") { e.preventDefault(); return; }
    // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i")) { e.preventDefault(); return; }
    // Ctrl+Shift+J / Cmd+Opt+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "J" || e.key === "j")) { e.preventDefault(); return; }
    // Ctrl+Shift+C / Cmd+Opt+C (Element picker)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "C" || e.key === "c")) { e.preventDefault(); return; }
    // Ctrl+U / Cmd+U (View source)
    if ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u")) { e.preventDefault(); return; }
    // Ctrl+S / Cmd+S (Save page)
    if ((e.ctrlKey || e.metaKey) && (e.key === "S" || e.key === "s")) { e.preventDefault(); return; }
  });

  // Detect DevTools via debugger timing
  let devtoolsOpen = false;
  const checkDevTools = () => {
    const start = performance.now();
    // debugger statement causes pause if devtools are open
    // Using Function constructor to avoid build-time removal
    try {
      const check = new Function("debugger");
      check();
    } catch {}
    const duration = performance.now() - start;
    if (duration > 100 && !devtoolsOpen) {
      devtoolsOpen = true;
      // Clear sensitive page content
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#ef4444;font-family:sans-serif;text-align:center;padding:20px"><div><h1 style="font-size:2rem;margin-bottom:1rem">⛔ Akses Ditolak</h1><p style="color:#888">Developer tools terdeteksi. Halaman ini tidak dapat diakses.</p></div></div>';
    }
  };

  // Run check periodically (every 2 seconds)
  const interval = setInterval(checkDevTools, 2000);

  // Disable drag (prevents dragging images/elements to inspect)
  document.addEventListener("dragstart", (e) => e.preventDefault());

  // Disable text selection on the page (optional layer)
  document.addEventListener("selectstart", (e) => {
    const target = e.target as HTMLElement;
    // Allow selection in input/textarea
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
    e.preventDefault();
  });

  // Disable copy
  document.addEventListener("copy", (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    e.preventDefault();
  });

  return () => {
    clearInterval(interval);
  };
}
