import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Palette } from "lucide-react";

const colorPresets = [
  { name: "Kenya Green", primary: "#006B3F", secondary: "#D4A843" },
  { name: "Navy & Gold", primary: "#1B2A4A", secondary: "#C9A84C" },
  { name: "Maroon", primary: "#800020", secondary: "#C9A84C" },
  { name: "Royal Blue", primary: "#002366", secondary: "#C0C0C0" },
];

export default function WizardBranding() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">School Branding</h2>
        <p className="text-muted-foreground mt-1">Upload your logo and set school colors for reports and documents.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">School Logo</Label>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG up to 2MB. Recommended: 500x500px</p>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">School Badge</Label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">Upload school badge for ID cards & report cards</p>
          </div>
        </div>

        <div>
          <Label className="mb-3 block">School Colors</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {colorPresets.map(c => (
              <button key={c.name} className="border border-border rounded-lg p-3 hover:border-primary transition-colors text-left">
                <div className="flex gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md" style={{ backgroundColor: c.primary }} />
                  <div className="w-8 h-8 rounded-md" style={{ backgroundColor: c.secondary }} />
                </div>
                <p className="text-xs font-medium text-foreground">{c.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input type="color" defaultValue="#006B3F" className="w-12 h-10 p-1 cursor-pointer" />
              <Input defaultValue="#006B3F" className="h-10 font-mono text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <Input type="color" defaultValue="#D4A843" className="w-12 h-10 p-1 cursor-pointer" />
              <Input defaultValue="#D4A843" className="h-10 font-mono text-sm" />
            </div>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Letterhead Template (Optional)</Label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">Upload letterhead for official documents</p>
          </div>
        </div>
      </div>
    </div>
  );
}
