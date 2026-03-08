import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, ArrowLeft, School, Palette, Calendar, Users, BookOpen, Shield, CreditCard, UserPlus, GraduationCap, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import WizardSchoolProfile from "@/components/onboarding/WizardSchoolProfile";
import WizardBranding from "@/components/onboarding/WizardBranding";
import WizardCalendar from "@/components/onboarding/WizardCalendar";
import WizardClasses from "@/components/onboarding/WizardClasses";
import WizardSubjects from "@/components/onboarding/WizardSubjects";
import WizardRoles from "@/components/onboarding/WizardRoles";
import WizardFees from "@/components/onboarding/WizardFees";
import WizardStaff from "@/components/onboarding/WizardStaff";
import WizardStudents from "@/components/onboarding/WizardStudents";
import WizardGoLive from "@/components/onboarding/WizardGoLive";

const steps = [
  { key: "profile", label: "School Profile", icon: School },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "calendar", label: "Academic Calendar", icon: Calendar },
  { key: "classes", label: "Classes & Streams", icon: Users },
  { key: "subjects", label: "Subjects (CBC)", icon: BookOpen },
  { key: "roles", label: "Roles & Permissions", icon: Shield },
  { key: "fees", label: "Fee Structure", icon: CreditCard },
  { key: "staff", label: "Staff Import", icon: UserPlus },
  { key: "students", label: "Student Admission", icon: GraduationCap },
  { key: "golive", label: "Go Live", icon: Rocket },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent(prev => Math.min(prev + 1, steps.length - 1));
  const prev = () => setCurrent(prev => Math.max(prev - 1, 0));
  const goLive = () => navigate("/dashboard");

  const StepComponent = [
    WizardSchoolProfile, WizardBranding, WizardCalendar, WizardClasses,
    WizardSubjects, WizardRoles, WizardFees, WizardStaff, WizardStudents, WizardGoLive
  ][current];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Steps */}
      <aside className="hidden lg:flex w-72 gradient-sidebar flex-col p-6 border-r border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center">
            <School className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-sidebar-foreground">ShuleCloud</h1>
            <p className="text-xs text-sidebar-foreground/60">School Setup</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const completed = i < current;
            const active = i === current;
            return (
              <button
                key={step.key}
                onClick={() => i <= current && setCurrent(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" :
                  completed ? "text-sidebar-primary cursor-pointer" :
                  "text-sidebar-foreground/40 cursor-default"
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  completed ? "bg-sidebar-primary text-sidebar-primary-foreground" :
                  active ? "bg-sidebar-accent-foreground text-sidebar-accent" :
                  "bg-sidebar-muted text-sidebar-foreground/40"
                }`}>
                  {completed ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span>{step.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50">Step {current + 1} of {steps.length}</p>
          <div className="mt-2 h-1.5 bg-sidebar-muted rounded-full overflow-hidden">
            <div className="h-full gradient-gold rounded-full transition-all duration-500" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile progress */}
        <div className="lg:hidden border-b border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{steps[current].label}</span>
            <span className="text-xs text-muted-foreground">{current + 1}/{steps.length}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-3xl w-full mx-auto">
          <StepComponent />
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-border p-4 md:p-6 flex items-center justify-between">
          <Button variant="ghost" onClick={prev} disabled={current === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          {current === steps.length - 1 ? (
            <Button onClick={goLive}>
              Launch School <Rocket className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={next}>
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
