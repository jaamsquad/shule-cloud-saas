import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  School, GraduationCap, Users, CreditCard, Shield, BarChart3,
  Calendar, BookOpen, ClipboardCheck, Heart, Library, Bell,
  ChevronRight, Check, Star, ArrowRight
} from "lucide-react";
import { resolvePortal } from "@/lib/portal";
import SchoolLanding from "./SchoolLanding";

const features = [
  { icon: Users, title: "Student Management", desc: "Full lifecycle from admission to alumni with CBC tracking" },
  { icon: BookOpen, title: "CBC Academics", desc: "Learning areas, strands, competencies and rubrics" },
  { icon: ClipboardCheck, title: "Assessments", desc: "Question bank, auto-generate exams, mark entry & analytics" },
  { icon: Calendar, title: "Smart Timetable", desc: "Auto-generation with clash detection and teacher availability" },
  { icon: CreditCard, title: "Fee Management", desc: "M-Pesa ready billing, invoices, arrears tracking" },
  { icon: Shield, title: "Role-Based Access", desc: "Granular permissions for every school role" },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Academic, financial, attendance reports with exports" },
  { icon: Heart, title: "School Clinic", desc: "Medical profiles, visits, medication and allergy alerts" },
  { icon: Library, title: "Library System", desc: "Catalog, circulation, fines and overdue tracking" },
  { icon: Bell, title: "Communications", desc: "Announcements, parent messaging, SMS & email" },
  { icon: GraduationCap, title: "Staff & HR", desc: "Workload tracking, leave management, appraisals" },
  { icon: School, title: "LMS", desc: "Courses, assignments, submissions and grading" },
];

const stats = [
  { value: "200+", label: "Schools" },
  { value: "50,000+", label: "Students" },
  { value: "99.9%", label: "Uptime" },
  { value: "47", label: "Counties" },
];

const testimonials = [
  { name: "Mrs. Wanjiku", role: "Head Teacher, Nairobi Girls Academy", quote: "ShuleCloud transformed how we manage our school. CBC compliance was seamless." },
  { name: "Mr. Ochieng", role: "Principal, Kisumu Boys High", quote: "The timetable auto-generation alone saved us 3 days of work every term." },
  { name: "Mrs. Chebet", role: "Bursar, Eldoret Heights", quote: "Fee collection tracking and M-Pesa integration made my work so much easier." },
];

export default function Landing() {
  // On a school subdomain (e.g. egerton.localhost) show the school's own
  // branded site instead of the ShuleCloud marketing page.
  if (resolvePortal().portal === "tenant") return <SchoolLanding />;

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">ShuleCloud</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            <Link to="/status" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Status</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-[0.03]" />
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent border border-border text-sm text-accent-foreground mb-6 animate-fade-in">
            <Star className="w-3.5 h-3.5 text-secondary" />
            <span>Kenya's #1 CBC-Compliant School Management Platform</span>
          </div>
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-foreground max-w-4xl mx-auto leading-tight animate-fade-in">
            Run Your School
            <span className="block text-primary"> Smarter with ShuleCloud</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            From admissions to report cards, fee collection to timetabling — manage everything in one powerful, CBC-ready platform built for Kenyan high schools.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link to="/contact">Start Free Trial <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link to="/features">Explore Features</Link>
            </Button>
          </div>
          <div className="mt-16 flex justify-center gap-12 md:gap-20 animate-fade-in">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl md:text-3xl font-heading font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Everything Your School Needs</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">A complete school management ecosystem — modular, scalable, and built specifically for Kenya's CBC curriculum.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {features.map(f => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-5 hover:shadow-card-hover transition-all hover:-translate-y-0.5 group cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-3 group-hover:gradient-primary transition-colors">
                  <f.icon className="w-5 h-5 text-accent-foreground group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-foreground text-center mb-12">Trusted by Schools Across Kenya</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-card border border-border rounded-xl p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />)}
                </div>
                <p className="text-foreground text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="gradient-primary rounded-2xl p-10 md:p-16 text-center">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Ready to Transform Your School?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">Join 200+ Kenyan schools already using ShuleCloud. Start your free 30-day trial today.</p>
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base" asChild>
              <Link to="/contact">Request Demo <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center">
                <School className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-foreground">ShuleCloud</span>
            </div>
            <p className="text-xs text-muted-foreground">Kenya's premier CBC-compliant school management platform.</p>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-foreground text-sm mb-3">Product</h4>
            <div className="space-y-2">
              <Link to="/features" className="block text-xs text-muted-foreground hover:text-foreground">Features</Link>
              <Link to="/pricing" className="block text-xs text-muted-foreground hover:text-foreground">Pricing</Link>
              <Link to="/status" className="block text-xs text-muted-foreground hover:text-foreground">Status</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-foreground text-sm mb-3">Company</h4>
            <div className="space-y-2">
              <Link to="/contact" className="block text-xs text-muted-foreground hover:text-foreground">Contact</Link>
              <Link to="/terms" className="block text-xs text-muted-foreground hover:text-foreground">Terms</Link>
              <Link to="/privacy" className="block text-xs text-muted-foreground hover:text-foreground">Privacy</Link>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-foreground text-sm mb-3">Support</h4>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">support@shulecloud.co.ke</p>
              <p className="text-xs text-muted-foreground">+254 700 000 000</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">© 2026 ShuleCloud. All rights reserved. Made in Kenya 🇰🇪</p>
        </div>
      </footer>
    </div>
  );
}
