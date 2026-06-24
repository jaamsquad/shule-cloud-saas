import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, User, Lock, Mail, ArrowRight, Globe, Building2, Phone, Clock, ShieldCheck, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type Step = "form" | "otp" | "waiting";

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
  const [step, setStep] = useState<Step>("form");
  const [otp, setOtp] = useState("");
  const [activationCode, setActivationCode] = useState("");

  const [formData, setFormData] = useState({
    schoolName: "",
    subdomain: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
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
    if (formData.password !== formData.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (!formData.subdomain) { toast.error("Subdomain is required"); return; }
    setIsLoading(true);
    try {
      await api.post("/onboard/register-tenant", formData);
      toast.success("Verification code sent to your email.");
      setStep("otp");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post("/onboard/verify-email", { subdomain: formData.subdomain, otp });
      toast.success("Email verified!");
      setStep("waiting");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Verification failed.");
    } finally { setIsLoading(false); }
  };

  const resendOtp = async () => {
    try { await api.post("/onboard/resend-otp", { subdomain: formData.subdomain }); toast.success("New code sent."); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Could not resend."); }
  };

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post("/onboard/activate", { subdomain: formData.subdomain, code: activationCode });
      toast.success("Account activated! You can now log in.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid activation code.");
    } finally { setIsLoading(false); }
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

          {/* Step 1 — Registration form */}
          {step === "form" && (
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

              <div className="relative group">
                <Phone className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2] transition-colors" />
                <input
                  id="adminPhone"
                  placeholder="Phone (e.g. +2547…)"
                  value={formData.adminPhone}
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
          )}

          {/* Step 2 — Email OTP verification */}
          {step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="flex items-center gap-2 text-[#5C67F2]"><ShieldCheck className="w-5 h-5" /><h3 className="font-black text-sm">Verify your email</h3></div>
              <p className="text-[11px] text-gray-500">We sent a 6-digit code to <b>{formData.adminEmail}</b>. Enter it below.</p>
              <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="● ● ● ● ● ●" inputMode="numeric"
                className="w-full text-center tracking-[0.5em] text-lg font-black bg-transparent border-b-2 border-gray-300 py-2 focus:outline-none focus:border-[#5C67F2]" autoFocus />
              <button type="submit" disabled={isLoading || otp.length < 6} className="w-full h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                <ShieldCheck className="w-4 h-4" /> {isLoading ? "VERIFYING…" : "Verify Email"}
              </button>
              <button type="button" onClick={resendOtp} className="w-full text-[11px] font-bold text-gray-500 flex items-center justify-center gap-1.5"><RefreshCw className="w-3 h-3" /> Resend code</button>
            </form>
          )}

          {/* Step 3 — Waiting for review + activation code */}
          {step === "waiting" && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h3 className="font-black text-amber-800 text-sm">Waiting for Review</h3>
                <p className="text-[11px] text-amber-700 mt-1">Your email is verified. A ShuleCloud administrator is reviewing your registration and will issue an <b>activation code</b> (by email or directly to you).</p>
              </div>
              <form onSubmit={activate} className="space-y-3">
                <div className="relative group">
                  <KeyRound className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5C67F2]" />
                  <input value={activationCode} onChange={e => setActivationCode(e.target.value.toUpperCase())} placeholder="Activation code (e.g. SCH-4827)"
                    className="w-full bg-transparent border-b border-gray-300 py-2 pl-7 pr-2 focus:outline-none focus:border-[#5C67F2] text-sm font-bold tracking-wide text-gray-700" />
                </div>
                <button type="submit" disabled={isLoading || !activationCode} className="w-full h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  <ArrowRight className="w-4 h-4" /> {isLoading ? "ACTIVATING…" : "Activate Account"}
                </button>
              </form>
              <p className="text-[10px] text-gray-400 text-center">Don't have a code yet? It will be provided once your school is reviewed.</p>
            </div>
          )}

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
