import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, CreditCard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FeeItem {
  name: string;
  amount: string;
  category: string;
  applies: string;
}

const defaultFees: FeeItem[] = [
  { name: "Tuition Fee", amount: "45,000", category: "Tuition", applies: "All Students" },
  { name: "Boarding Fee", amount: "25,000", category: "Boarding", applies: "Boarders Only" },
  { name: "Activity Fee", amount: "5,000", category: "Activity", applies: "All Students" },
  { name: "Computer Lab Fee", amount: "3,000", category: "Lab", applies: "All Students" },
  { name: "Exam Fee", amount: "2,500", category: "Exam", applies: "All Students" },
];

export default function WizardFees() {
  const [fees, setFees] = useState<FeeItem[]>(defaultFees);

  const removeItem = (idx: number) => {
    setFees(prev => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setFees(prev => [...prev, { name: "", amount: "", category: "Other", applies: "All Students" }]);
  };

  const total = fees.reduce((sum, f) => sum + (parseInt(f.amount.replace(/,/g, "")) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Fee Structure</h2>
        <p className="text-muted-foreground mt-1">Set up per-term fee items. You can create different structures by grade later.</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground text-sm">Term 1, 2026 Fees</h3>
            <Badge variant="secondary" className="text-xs">Total: KES {total.toLocaleString()}</Badge>
          </div>

          <div className="space-y-3">
            {fees.map((fee, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4 space-y-1">
                  {i === 0 && <Label className="text-xs">Fee Name</Label>}
                  <Input
                    value={fee.name}
                    onChange={e => setFees(prev => prev.map((f, fi) => fi === i ? { ...f, name: e.target.value } : f))}
                    placeholder="Fee name"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  {i === 0 && <Label className="text-xs">Amount (KES)</Label>}
                  <Input
                    value={fee.amount}
                    onChange={e => setFees(prev => prev.map((f, fi) => fi === i ? { ...f, amount: e.target.value } : f))}
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  {i === 0 && <Label className="text-xs">Applies To</Label>}
                  <Select
                    value={fee.applies}
                    onValueChange={val => setFees(prev => prev.map((f, fi) => fi === i ? { ...f, applies: val } : f))}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Students">All Students</SelectItem>
                      <SelectItem value="Boarders Only">Boarders Only</SelectItem>
                      <SelectItem value="Day Scholars">Day Scholars</SelectItem>
                      <SelectItem value="Form 1">Form 1 Only</SelectItem>
                      <SelectItem value="Form 4">Form 4 Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(i)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="mt-4" onClick={addItem}>
            <Plus className="w-3 h-3 mr-1" /> Add Fee Item
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
