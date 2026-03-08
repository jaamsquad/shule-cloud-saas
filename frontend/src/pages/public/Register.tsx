import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { School, Eye, EyeOff, ArrowRight, Building2, User, Mail, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: "",
    subdomain: "",
    adminName: "",
    adminEmail: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'subdomain') {
      // Only allow lowercase, numbers, hyphens
      setFormData(prev => ({ ...prev, [id]: value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!formData.subdomain) {
      toast.error("Please enter a school subdomain");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/onboard/register-tenant", formData);
      // Store tokens if returned
      if (res.data.access_token) {
        localStorage.setItem("auth_token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
      }
      toast.success("School account created successfully! Welcome to ShuleCloud.");
      navigate("/onboarding");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Information/Visuals */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-primary-foreground/20" />
          <div className="absolute bottom-32 right-16 w-96 h-96 rounded-full border border-primary-foreground/20" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full border border-primary-foreground/20" />
        </div>
        <div className="relative z-10 max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto">
            <School className="w-8 h-8 text-secondary-foreground" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-primary-foreground">Join ShuleCloud</h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Take the first step towards a smarter, CBC-compliant school management experience. Trusted by hundreds of schools across Kenya.
          </p>

          <div className="space-y-4 pt-6 text-left">
            {[
              { icon: Building2, text: "Multi-campus Support" },
              { icon: Globe, text: "Your Own School Portal" },
              { icon: ArrowRight, text: "Instant CBC Report Cards" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-primary-foreground/10 p-3 rounded-lg backdrop-blur-sm border border-primary-foreground/10">
                <div className="w-8 h-8 rounded-md bg-secondary/20 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-secondary" />
                </div>
                <span className="text-primary-foreground font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-8 py-12">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">ShuleCloud</h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-bold text-foreground">Create school account</h2>
            <p className="text-muted-foreground">Start your 14-day free trial today</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-1 gap-5">
              {/* School Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="schoolName"
                      placeholder="e.g. Kings High School"
                      value={formData.schoolName}
                      onChange={handleChange}
                      className="h-11 pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdomain">School Short Name / Subdomain</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="subdomain"
                      placeholder="e.g. kingshigh"
                      value={formData.subdomain}
                      onChange={handleChange}
                      className="h-11 pl-10 pr-32"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      .shulecloud.co.ke
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">This will be your school's unique URL</p>
                </div>
              </div>

              <div className="h-px bg-border my-2" />

              {/* Admin Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Administrator Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="adminName"
                      placeholder="John Doe"
                      value={formData.adminName}
                      onChange={handleChange}
                      className="h-11 pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@school.com"
                      value={formData.adminEmail}
                      onChange={handleChange}
                      className="h-11 pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="h-11 pl-10 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-medium mt-4" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="underline">Terms of Service</Link> and{" "}
              <Link to="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
