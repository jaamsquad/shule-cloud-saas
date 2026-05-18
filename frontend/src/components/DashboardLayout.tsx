import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopHeader from "./TopHeader";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: theme } = useQuery({
      queryKey: ["theme_settings"],
      queryFn: async () => {
          const r = await api.get("/theme_settings");
          return r.data?.[0];
      }
  });

  const isRTL = theme?.themePlacement === "RTL";

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Global Header */}
      <TopHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
          <AppSidebar />
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50/10">
            <Outlet />
          </div>
          
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#5C67F2]/5 rounded-full blur-[100px] pointer-events-none -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFC165]/5 rounded-full blur-[100px] pointer-events-none -ml-48 -mb-48" />
        </main>
      </div>
    </div>
  );
}
