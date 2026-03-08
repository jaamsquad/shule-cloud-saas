import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, School } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function OwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/owner/auth/login", { email, password });
      localStorage.setItem("owner_token", res.data.access_token);
      toast.success("Welcome, Platform Admin");
      navigate("/owner/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid credentials";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-sidebar flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl border-sidebar-border bg-sidebar/50 backdrop-blur-xl">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <School className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-heading font-bold text-white">Owner Portal</CardTitle>
          <CardDescription className="text-sidebar-foreground/60">
            System administration for ShuleCloud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/40" />
              <Input
                type="email"
                placeholder="admin@shulecloud.co.ke"
                className="pl-10 bg-sidebar-accent/50 border-sidebar-border text-white placeholder:text-sidebar-foreground/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/40" />
              <Input
                type="password"
                placeholder="••••••••"
                className="pl-10 bg-sidebar-accent/50 border-sidebar-border text-white placeholder:text-sidebar-foreground/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In to Control Center"}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-sidebar-border text-center space-y-2">
            <p className="text-sm text-sidebar-foreground/60">
              Don't have an account?{" "}
              <Link to="/owner/register" className="text-primary font-semibold hover:underline">
                Register
              </Link>
            </p>
            <p className="text-xs text-sidebar-foreground/40 font-mono tracking-widest uppercase">
              Authorized Access Only
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
