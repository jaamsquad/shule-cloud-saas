import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WizardSchoolProfile() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">School Profile</h2>
        <p className="text-muted-foreground mt-1">Basic information about your school.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label>School Name *</Label>
          <Input placeholder="King's High School" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label>School Motto</Label>
          <Input placeholder="Education for Excellence" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label>KNEC Code</Label>
          <Input placeholder="47001001" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label>School Type</Label>
          <Select>
            <SelectTrigger className="h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="national">National School</SelectItem>
              <SelectItem value="extra-county">Extra County</SelectItem>
              <SelectItem value="county">County School</SelectItem>
              <SelectItem value="sub-county">Sub-County School</SelectItem>
              <SelectItem value="private">Private School</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select>
            <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="boys">Boys Only</SelectItem>
              <SelectItem value="girls">Girls Only</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Boarding Status</Label>
          <Select>
            <SelectTrigger className="h-10"><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="boarding">Boarding</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="mixed">Mixed (Day & Boarding)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>County</Label>
          <Select>
            <SelectTrigger className="h-10"><SelectValue placeholder="Select county" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nairobi">Nairobi</SelectItem>
              <SelectItem value="mombasa">Mombasa</SelectItem>
              <SelectItem value="kisumu">Kisumu</SelectItem>
              <SelectItem value="nakuru">Nakuru</SelectItem>
              <SelectItem value="eldoret">Uasin Gishu</SelectItem>
              <SelectItem value="kiambu">Kiambu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input type="tel" placeholder="+254 7XX XXX XXX" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label>Email Address</Label>
          <Input type="email" placeholder="info@kingshigh.sc.ke" className="h-10" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Postal Address</Label>
          <Input placeholder="P.O. Box 12345 - 00100, Nairobi" className="h-10" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>About / Description</Label>
          <Textarea placeholder="Brief description of your school..." rows={3} />
        </div>
      </div>
    </div>
  );
}
