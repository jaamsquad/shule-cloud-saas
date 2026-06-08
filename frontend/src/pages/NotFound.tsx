import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, LayoutDashboard, Home } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import TopHeader from "@/components/TopHeader";

const NotFound = () => {
  const location = useLocation();
  const [isLoggedIn] = useState(!!localStorage.getItem("token"));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const content = (
    <div className="flex-1 bg-white text-[#1a1a1a] font-sans flex flex-col p-6 md:p-12 selection:bg-[#1a1a1a] selection:text-white overflow-hidden relative w-full">
      {/* Header for non-logged in */}
      {!isLoggedIn && (
        <header className="flex items-center justify-between z-10 relative">
          <button className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <Menu className="w-5 h-5 text-gray-500 stroke-[1.5]" />
          </button>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col relative ${isLoggedIn ? 'mt-4' : 'mt-12 md:mt-20'}`}>
        <h2 className="text-[32px] md:text-[42px] lg:text-[48px] font-medium leading-[1.1] max-w-[26rem] md:max-w-3xl tracking-tight text-[#1a1a1a]">
          Uh oh, the page you're looking for<br className="hidden md:block" /> can't be found.
        </h2>

        {/* Navigation Buttons */}
        <div className="mt-8 relative z-20">
          {isLoggedIn ? (
            <Link to="/dashboard" className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors w-max shadow-lg shadow-black/10">
              <LayoutDashboard className="w-5 h-5" /> Back to Dashboard
            </Link>
          ) : (
            <Link to="/dashboard" className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors w-max shadow-lg shadow-black/10">
              <Home className="w-5 h-5" /> Return Dashboard
            </Link>
          )}
        </div>

        {/* Center Illustration - The Eyes */}
        <div className="flex-1 flex items-center justify-center -mt-24 md:mt-0 pointer-events-none">
          <svg width="240" height="160" viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[200px] md:w-[280px]">
            {/* Left Eyebrow */}
            <path d="M45,55 Q75,35 105,55" stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" />
            {/* Right Eyebrow */}
            <path d="M135,55 Q165,35 195,55" stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round" />

            {/* Left Eye */}
            <circle cx="75" cy="100" r="40" stroke="#1a1a1a" strokeWidth="10" fill="none" />
            {/* Left Pupil */}
            <circle cx="88" cy="85" r="15" fill="#1a1a1a" />

            {/* Right Eye */}
            <circle cx="165" cy="100" r="40" stroke="#1a1a1a" strokeWidth="10" fill="none" />
            {/* Right Pupil */}
            <circle cx="178" cy="85" r="15" fill="#1a1a1a" />
          </svg>
        </div>
      </main>
    </div>
  );

  if (isLoggedIn) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#f8fafc] overflow-hidden ltr">
        <TopHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1 overflow-hidden relative">
          <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
            <AppSidebar />
          </div>
          <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex">
              {content}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen flex">{content}</div>;
};

export default NotFound;
