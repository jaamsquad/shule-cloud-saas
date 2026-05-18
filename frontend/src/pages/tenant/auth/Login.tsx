import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, User, Lock, ArrowRight, ShieldCheck, GraduationCap as StudentIcon, Users, Globe } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "employee" | "student">("admin");
  const [subdomain, setSubdomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-detect subdomain from URL if applicable
  const detectedSubdomain = (() => {
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length > 2 && parts[0] !== 'www') return parts[0];
    return '';
  })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const actualSubdomain = detectedSubdomain || subdomain;
    if (!actualSubdomain && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        toast.error("Please enter your school subdomain");
        return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email,
        password,
        subdomain: actualSubdomain,
      });
      localStorage.setItem("auth_token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success(`Welcome back!`);
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-white font-sans overflow-hidden">
      {/* Left Column - Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 lg:px-12 bg-[#f0f2ff]">
        <div className="w-full max-w-[340px] space-y-6">
          {/* Logo & Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-gray-800">
                shule<span className="text-[#5C67F2]">cloud</span>
              </h1>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Please enter your credentials to access your school dashboard.</p>
            <h2 className="text-base font-bold text-[#5C67F2]">Welcome Back! 👋</h2>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-[#868DF4] text-center">You're</p>
            <div className="flex justify-center gap-4">
                <RoleButton active={role === 'admin'} onClick={() => setRole('admin')} icon={<ShieldCheck />} label="Admin" />
                <RoleButton active={role === 'employee'} onClick={() => setRole('employee')} icon={<Users />} label="Employee" />
                <RoleButton active={role === 'student'} onClick={() => setRole('student')} icon={<StudentIcon />} label="Student" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              {/* Show subdomain field only on localhost when not detected */}
              {(!detectedSubdomain && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) && (
                <div className="relative group">
                    <Globe className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                    <input
                    type="text"
                    placeholder="School Subdomain (e.g. muzamila)"
                    value={subdomain}
                    onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-4 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                    required
                    />
                </div>
              )}
              <div className="relative group">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                <input
                  type="email"
                  placeholder="Your Email Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-4 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                  required
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-10 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5C67F2]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="w-3.5 h-3.5 rounded border-gray-300 text-[#5C67F2] focus:ring-[#5C67F2]" />
              <label htmlFor="remember" className="text-[11px] font-bold text-gray-400">Remember Me</label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 text-sm"
            >
              <Lock className="w-4 h-4" /> {isLoading ? "LOGGING IN..." : "Login"}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link to="/forgot-password" className="text-[11px] font-black text-gray-800 hover:text-[#5C67F2] transition-colors">
              Forgot your <span className="text-[#5C67F2]">password?</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column - Brand & Image */}
      <div className="hidden lg:flex w-[45%] bg-[#241B5C] relative flex-col items-center justify-center p-12 text-center text-white overflow-hidden">
        {/* Sign Up Link */}
        <div className="absolute top-10 right-10 flex items-center gap-4">
            <span className="text-sm font-medium text-purple-200">Don't have an account?</span>
            <Link to="/register" className="px-6 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
                <User className="w-4 h-4" /> Sign Up
            </Link>
        </div>

        <div className="relative z-10 space-y-4 max-w-sm mt-12">
          <h2 className="text-3xl font-black tracking-tight leading-tight">Continue Managing!</h2>
          <p className="text-sm text-purple-200 leading-relaxed font-medium">
            Pick up right where you left off. Sign in to the world's favorite fast, easy, and 100% cloud-based school management platform.
          </p>
        </div>

        <div className="relative mt-auto w-full max-w-lg aspect-square">
            {/* Abstract Shapes */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#241B5C] via-transparent to-transparent z-10"></div>
            <img 
                src="/auth-hero.png" 
                alt="Student" 
                className="w-full h-full object-contain object-bottom relative z-0 opacity-90 scale-110 translate-y-10"
            />
        </div>
      </div>
    </div>
  );
}

function RoleButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'scale-105' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
        >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${active ? 'bg-[#5C67F2] border-[#5C67F2] text-white shadow-md' : 'bg-white border-gray-300 text-gray-500'}`}>
                {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
            </div>
            <span className={`text-[10px] font-bold ${active ? 'text-[#5C67F2]' : 'text-gray-400'}`}>{label}</span>
        </button>
    );
}

import React from "react";
