import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Password updated!", description: "You can now sign in with your new password." });
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <School className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password below.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" placeholder="••••••••" className="h-11" required />
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input type="password" placeholder="••••••••" className="h-11" required />
          </div>
          <Button type="submit" className="w-full h-11">Update Password</Button>
        </form>
      </div>
    </div>
  );
}
