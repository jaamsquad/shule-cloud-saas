import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AcceptInvite() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Account created!", description: "Welcome to ShuleCloud." });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <School className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">You're Invited!</h1>
          <p className="text-sm text-muted-foreground">Set up your account to join King's High School on ShuleCloud.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">First Name</Label>
              <Input placeholder="John" className="h-10" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last Name</Label>
              <Input placeholder="Ochieng" className="h-10" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email (pre-filled)</Label>
            <Input type="email" value="john@kingshigh.sc.ke" className="h-10 bg-muted" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Create Password</Label>
            <Input type="password" placeholder="••••••••" className="h-10" required />
          </div>
          <Button type="submit" className="w-full h-11">Accept & Join</Button>
        </form>
      </div>
    </div>
  );
}
