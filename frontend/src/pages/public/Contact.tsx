import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { School, Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Request received!", description: "We'll get back to you within 24 hours." });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">ShuleCloud</span>
          </Link>
          <Button size="sm" asChild><Link to="/login">Sign In</Link></Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-bold text-foreground">Get in Touch</h1>
          <p className="mt-3 text-muted-foreground">Request a demo or ask us anything about ShuleCloud.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardContent className="p-6 space-y-4">
                {[
                  { icon: Mail, label: "Email", value: "hello@shulecloud.co.ke" },
                  { icon: Phone, label: "Phone", value: "+254 700 000 000" },
                  { icon: MapPin, label: "Office", value: "Nairobi, Kenya" },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <c.icon className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className="text-sm font-medium text-foreground">{c.value}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardContent className="p-6">
              {submitted ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-lg">Thank You!</h3>
                  <p className="text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">First Name</Label>
                      <Input placeholder="Jane" className="h-10" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Last Name</Label>
                      <Input placeholder="Wanjiku" className="h-10" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">School Name</Label>
                    <Input placeholder="King's High School" className="h-10" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" placeholder="jane@school.ac.ke" className="h-10" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input type="tel" placeholder="+254 7XX XXX XXX" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Message</Label>
                    <Textarea placeholder="Tell us about your school and what you need..." rows={4} required />
                  </div>
                  <Button type="submit" className="w-full">Request Demo</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
