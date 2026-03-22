import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
