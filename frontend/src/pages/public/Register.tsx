import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, User, Lock, Mail, ArrowRight, ShieldCheck, Globe, Building2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Register() {
  const navigate = useNavigate();

  // If the platform owner has disabled public registration, redirect to landing.
  useEffect(() => {
    let active = true;
    api.get("/onboard/public-settings")
      .then((r) => { if (active && r.data?.registrationEnabled === false) { toast.info("Registration is currently closed. Please contact us."); navigate("/", { replace: true }); } })
      .catch(() => {});
    return () => { active = false; };
  }, [navigate]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: "",
    subdomain: "",
    adminName: "",
    adminEmail: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'subdomain') {
        setFormData(prev => ({ ...prev, [id]: value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
    } else {
        setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.subdomain) {
        toast.error("Subdomain is required");
        return;
    }
    setIsLoading(true);
    try {
      await api.post("/onboard/register-tenant", formData);
      toast.success("School account created successfully!");
      navigate("/login"); // Navigate to login after registration
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-white font-sans overflow-hidden">
      {/* Left Column - Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 lg:px-12 bg-[#f0f2ff]">
        <div className="w-full max-w-[360px] space-y-5">
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
            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
              Start managing your school like a pro!
            </p>
            <h2 className="text-base font-bold text-[#5C67F2]">Create Account.</h2>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                    <Building2 className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                    <input
                    id="schoolName"
                    placeholder="School Name"
                    value={formData.schoolName}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-2 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                    required
                    />
                </div>
                <div className="relative group">
                    <Globe className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                    <input
                    id="subdomain"
                    placeholder="Subdomain"
                    value={formData.subdomain}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-2 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                    required
                    />
                </div>
              </div>

              <div className="relative group">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                <input
                  id="adminName"
                  placeholder="Full Name"
                  value={formData.adminName}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-4 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                  required
                />
              </div>

              <div className="relative group">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                <input
                  id="adminEmail"
                  type="email"
                  placeholder="Email Address"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-4 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                    <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-8 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                    required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                </div>
                <div className="relative group">
                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                    <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-8 focus:outline-none focus:border-[#5C67F2] transition-all text-xs text-gray-700 font-medium"
                    required
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400">
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="terms" className="w-3.5 h-3.5 rounded border-gray-300 text-[#5C67F2] focus:ring-[#5C67F2]" required />
              <label htmlFor="terms" className="text-[10px] font-bold text-gray-400">Accept <Link to="/terms" className="text-[#5C67F2]">Terms</Link></label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 text-sm"
            >
              <ArrowRight className="w-4 h-4" /> {isLoading ? "CREATING..." : "Sign Up"}
            </button>
          </form>

          <div className="text-center pt-1">
            <Link to="/login" className="text-[11px] font-black text-gray-800 hover:text-[#5C67F2] transition-colors">
              Have an account? <span className="text-[#5C67F2]">Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column - Brand & Image */}
      <div className="hidden lg:flex w-[45%] bg-[#241B5C] relative flex-col items-center justify-center p-12 text-center text-white overflow-hidden">
        {/* Login Link */}
        <div className="absolute top-10 right-10 flex items-center gap-4">
            <span className="text-[11px] font-medium text-purple-200">Already have an account?</span>
            <Link to="/login" className="px-4 py-1.5 bg-[#5C67F2] hover:bg-[#4a54c4] rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all">
                <Lock className="w-3.5 h-3.5" /> Login
            </Link>
        </div>

        <div className="relative z-10 space-y-4 max-w-sm mt-12">
          <h2 className="text-3xl font-black tracking-tight leading-tight">Start Free Trial Today!</h2>
          <p className="text-sm text-purple-200 leading-relaxed font-medium">
            Create your school <span className="text-white font-bold">dashboard</span> and start managing <span className="text-white font-bold">instantly</span>.
          </p>
        </div>

        {/* Hero Image */}
        <div className="relative mt-auto w-full max-w-lg aspect-square">
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
