import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, School, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function OwnerRegister() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        setLoading(true);
        try {
            const res = await api.post("/owner/auth/register", { name, email, password });
            localStorage.setItem("owner_token", res.data.access_token);
            toast.success("Platform account created successfully!");
            navigate("/owner/dashboard");
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Registration failed";
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
                        <ShieldCheck className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-heading font-bold text-white">Create Owner Account</CardTitle>
                    <CardDescription className="text-sidebar-foreground/60">
                        Register as a ShuleCloud platform administrator
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/40" />
                            <Input
                                type="text"
                                placeholder="Full Name"
                                className="pl-10 bg-sidebar-accent/50 border-sidebar-border text-white placeholder:text-sidebar-foreground/30"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
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
                                minLength={6}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Creating Account..." : "Create Platform Account"}
                        </Button>
                    </form>
                    <div className="mt-6 pt-6 border-t border-sidebar-border text-center space-y-2">
                        <p className="text-sm text-sidebar-foreground/60">
                            Already have an account?{" "}
                            <Link to="/owner" className="text-primary font-semibold hover:underline">
                                Sign In
                            </Link>
                        </p>
                        <p className="text-xs text-sidebar-foreground/40 font-mono tracking-widest uppercase">
                            Authorized Personnel Only
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
