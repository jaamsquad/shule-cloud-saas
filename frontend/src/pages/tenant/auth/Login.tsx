import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { School, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (!actualSubdomain) {
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
      // Store tokens and user info
      localStorage.setItem("auth_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("tenant", JSON.stringify(res.data.tenant));
      toast.success(`Welcome back, ${res.data.user.firstName}!`);
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Login failed. Please check your credentials.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
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
          <h1 className="text-4xl font-heading font-bold text-primary-foreground">ShuleCloud</h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Kenya's premier CBC-compliant school management platform. Streamline administration, empower teachers, engage parents.
          </p>
          <div className="flex items-center justify-center gap-6 pt-4">
            {["200+ Schools", "50K+ Students", "CBC Ready"].map(stat => (
              <div key={stat} className="text-center">
                <p className="text-sm font-medium text-primary-foreground/90">{stat}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">ShuleCloud</h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your school portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Show subdomain field only when not detected from URL */}
            {!detectedSubdomain && (
              <div className="space-y-2">
                <Label htmlFor="subdomain">School Subdomain</Label>
                <div className="relative">
                  <Input
                    id="subdomain"
                    type="text"
                    placeholder="e.g. kingshigh"
                    value={subdomain}
                    onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="h-11 pr-32"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                    .shulecloud.co.ke
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@school.ke"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  required
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

            <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground my-4">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Register School
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            Powered by ShuleCloud · CBC Compliant · Secure & Reliable
          </p>
        </div>
      </div>
    </div>
  );
}
