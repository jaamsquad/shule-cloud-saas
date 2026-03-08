import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, School, ArrowRight } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function Pricing() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await api.get("/plans");
      return res.data;
    }
  });

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
          <div className="hidden md:flex items-center gap-8">
            <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
            <Link to="/pricing" className="text-sm font-medium text-foreground">Pricing</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
          <Button size="sm" asChild><Link to="/login">Sign In</Link></Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">Simple, Transparent Pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">All plans include a 30-day free trial. No setup fees. Cancel anytime.</p>
          <p className="mt-2 text-sm text-muted-foreground">All prices in KES. Annual billing available at 20% discount.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {isLoading ? (
            <div className="col-span-3 text-center py-20 text-muted-foreground animate-pulse">Loading pricing plans...</div>
          ) : plans.length === 0 ? (
            <div className="col-span-3 text-center py-20 text-muted-foreground">No plans currently available. Please contact us.</div>
          ) : (
            plans.map((plan: any) => (
              <Card key={plan.id} className={`relative shadow-card hover:shadow-card-hover transition-all ${plan.name === 'Premium' ? "border-primary border-2 scale-[1.02]" : ""}`}>
                {plan.name === 'Premium' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-gold text-secondary-foreground border-0 px-4">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Comprehensive school management</p>
                  <div className="pt-3">
                    <span className="text-4xl font-heading font-bold text-foreground">KES {Number(plan.price).toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm">/{plan.cycle.toLowerCase().replace('ly', '')}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" variant={plan.name === 'Premium' ? "default" : "outline"} asChild>
                    <Link to="/register">Start Free Trial <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">Up to {plan.limits?.maxStudents?.toLocaleString() || 'Unlimited'} students</span>
                    </div>
                    {Object.entries(plan.moduleToggles || {}).map(([key, value]) => value && (
                      <div key={key} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground capitalize">{key} Module</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground italic">{plan.cycle} billing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
