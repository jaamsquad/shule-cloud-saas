import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden min-w-0">
        <AppHeader onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <Outlet />
      </main>
    </div>
  );
}
