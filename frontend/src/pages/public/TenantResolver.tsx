import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, ArrowRight } from "lucide-react";

export default function TenantResolver() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <School className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Find Your School</h1>
          <p className="text-sm text-muted-foreground">Enter your school's subdomain or code to access your portal.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-left">
            <Label>School Code / Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="kingshigh"
                className="h-11"
                required
              />
              <span className="text-sm text-muted-foreground flex-shrink-0">.shulecloud.co.ke</span>
            </div>
          </div>
          <Button type="submit" className="w-full h-11">
            Go to School Portal <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
}
