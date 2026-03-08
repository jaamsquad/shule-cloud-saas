import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { School, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast({ title: "Reset link sent!", description: "Check your email for the password reset link." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <School className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {sent ? "Check Your Email" : "Reset Password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sent ? "We've sent a password reset link to your email." : "Enter your email and we'll send you a reset link."}
          </p>
        </div>
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" placeholder="you@school.ac.ke" className="h-11" required />
            </div>
            <Button type="submit" className="w-full h-11">Send Reset Link</Button>
          </form>
        ) : (
          <Button variant="outline" className="w-full h-11" asChild>
            <Link to="/login"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In</Link>
          </Button>
        )}
        <p className="text-center">
          <Link to="/login" className="text-sm text-primary hover:underline">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
