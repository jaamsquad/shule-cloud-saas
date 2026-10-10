import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useItems } from '@/hooks/useItems';
import { toast } from 'sonner';
import { Award, FileText, Printer, Search, Settings2, Users, Loader2, Sparkles, School, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { openPrintDoc } from "@/lib/pdfDoc";

export default function GenerateCertificate() {
    const [mode, setMode] = useState<'STANDARD' | 'LEAVING' | 'TRANSFER'>('STANDARD');
    
    // Recipient state for standard
    const [recipientType, setRecipientType] = useState('STUDENT');
    const [certType, setCertType] = useState('ACHIEVEMENT');
    
    // standard preview/form state
    const [previewData, setPreviewData] = useState({
        title: "CERTIFICATE OF ACHIEVEMENT",
        body: "This is proudly presented to acknowledge outstanding performance and dedication during the academic year.",
        recipient: "Student Name",
        date: new Date().toLocaleDateString(),
        sig1Name: "Principal Name",
        sig1Desig: "School Principal",
        sig2Name: "Teacher Name",
        sig2Desig: "Class Teacher"
    });

    // leaving state
    const [leavingData, setLeavingData] = useState({
        admNo: "",
        fullName: "Student Name",
        classLeft: "",
        dateAdmission: new Date().toISOString().split('T')[0],
        dateLeaving: new Date().toISOString().split('T')[0],
        dob: "",
        conduct: "Excellent",
        reason: "Completed course of study",
        remarks: "Highly disciplined and motivated.",
        principal: "Principal Name"
    });

    // transfer state
    const [transferData, setTransferData] = useState({
        tcNo: `TC/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
        admNo: "",
        fullName: "Student Name",
        parentName: "",
        dob: "",
        classStudying: "",
        subjects: "English, Mathematics, Science, Social Studies",
        promotedTo: "Promoted to Next Grade",
        duesPaidUpTo: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        dateStruckOff: new Date().toISOString().split('T')[0],
        dateApply: new Date().toISOString().split('T')[0],
        dateIssue: new Date().toISOString().split('T')[0],
        reason: "Parent's Transfer",
        conduct: "Good",
        principal: "Principal Name"
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

    const { items: students } = useItems("students");
    const { items: staff } = useItems("staff");

    // In Leaving & Transfer, we always filter students. In standard, depends on recipientType.
    const recipients = (mode !== 'STANDARD' || recipientType === "STUDENT") ? students : staff;
    
    const filteredRecipients = searchQuery.trim() === "" 
        ? [] 
        : recipients.filter((r: any) => {
            const name = (r.studentName || r.employeeName || r.name || "").toLowerCase();
            const identifier = (r.registrationNo || r.designation || "").toLowerCase();
            return name.includes(searchQuery.toLowerCase()) || identifier.includes(searchQuery.toLowerCase());
        });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post('/certificates', data);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Certificate generated and stored successfully!");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || "Failed to generate certificate");
        }
    });

    const [selectedClassId, setSelectedClassId] = useState("");

    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["classes"],
        queryFn: async () => (await api.get("/classes")).data || []
    });

    const classStudents = students.filter((s: any) => {
        if (!selectedClassId) return false;
        if (s.classId === selectedClassId) return true;
        const studentClass = (s.studentClass || "").toLowerCase();
        const selectedClassObj = classes.find((c: any) => c._id === selectedClassId);
        const className = (selectedClassObj?.name || selectedClassObj?.levelName || "").toLowerCase();
        return className && studentClass === className;
    });

    const previewName = recipientType === "CLASS"
        ? (classStudents[0]?.studentName || classStudents[0]?.name || "[Student Name]")
        : previewData.recipient;

    const handleGenerate = async () => {
        if (mode === 'LEAVING') {
            if (!selectedRecipient) {
                toast.error("Please search and select a student first");
                return;
            }
            createMutation.mutate({
                recipientName: leavingData.fullName,
                recipientType: "STUDENT",
                certificateType: "LEAVING",
                title: "School Leaving Certificate",
                body: JSON.stringify(leavingData),
                sig1Name: leavingData.principal,
                sig1Desig: "Principal",
                recipientId: selectedRecipient._id,
            });
        } else if (mode === 'TRANSFER') {
            if (!selectedRecipient) {
                toast.error("Please search and select a student first");
                return;
            }
            createMutation.mutate({
                recipientName: transferData.fullName,
                recipientType: "STUDENT",
                certificateType: "TRANSFER",
                title: "Transfer Certificate",
                body: JSON.stringify(transferData),
                sig1Name: transferData.principal,
                sig1Desig: "Principal",
                recipientId: selectedRecipient._id,
            });
        } else {
            if (recipientType === "CLASS") {
                if (!selectedClassId) {
                    toast.error("Please select a class first");
                    return;
                }
                if (classStudents.length === 0) {
                    toast.error("No students found in this class");
                    return;
                }
                toast.info(`Generating certificates for ${classStudents.length} students...`);
                try {
                    await Promise.all(classStudents.map(student => {
                        const name = student.studentName || student.name;
                        return api.post('/certificates', {
                            recipientName: name,
                            recipientType: "STUDENT",
                            certificateType: certType,
                            title: previewData.title,
                            body: previewData.body,
                            sig1Name: previewData.sig1Name,
                            sig1Desig: previewData.sig1Desig,
                            sig2Name: previewData.sig2Name,
                            sig2Desig: previewData.sig2Desig,
                            date: previewData.date,
                            recipientId: student._id,
                        });
                    }));
                    toast.success(`Successfully generated ${classStudents.length} certificates!`);
                } catch (err: any) {
                    toast.error("Some certificates failed to generate");
                }
            } else {
                if (!selectedRecipient) {
                    toast.error("Please search and select a recipient first");
                    return;
                }
                createMutation.mutate({
                    recipientName: previewData.recipient,
                    recipientType,
                    certificateType: certType,
                    title: previewData.title,
                    body: previewData.body,
                    sig1Name: previewData.sig1Name,
                    sig1Desig: previewData.sig1Desig,
                    sig2Name: previewData.sig2Name,
                    sig2Desig: previewData.sig2Desig,
                    date: previewData.date,
                    recipientId: selectedRecipient._id,
                });
            }
        }
    };

    const { data: activeTemplate } = useQuery({
        queryKey: ['certificate_templates', 'active'],
        queryFn: async () => {
            const res = await api.get('/certificate-templates/active');
            return res.data.data;
        }
    });

    const { data: tenantProfile } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
    });

    const schoolName = tenantProfile?.name || tenantProfile?.schoolName || tenantProfile?.instituteName || "INSTITUTION NAME";
    const schoolLogo = tenantProfile?.logo || tenantProfile?.logoUrl || "";

    const handlePrintCurrent = () => {
        const accentColor = activeTemplate?.accent_color || '#1e3a8a';
        const logoHtml = schoolLogo
            ? `<img src="${schoolLogo}" style="height: 60px; object-fit: contain; margin-bottom: 8px;" />`
            : `<div style="margin-bottom: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg></div>`;

        const isLeaving = mode === 'LEAVING';
        const isTransfer = mode === 'TRANSFER';
        const isPortrait = isLeaving || isTransfer;

        let certsHtml = "";

        if (mode === 'LEAVING') {
            certsHtml = `
<div class="cert-container" style="border: 12px double #1e3a8a; padding: 15mm; font-family: 'Inter', sans-serif; height: 297mm; width: 210mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background: #fff; position: relative;">
  <div style="position: absolute; top: 6px; left: 6px; right: 6px; bottom: 6px; border: 2px solid #1e3a8a88; pointer-events: none;"></div>
  
  <div style="text-align: center;">
    ${logoHtml}
    <h2 style="font-family: 'Cinzel', serif; font-size: 24px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 2px;">${schoolName}</h2>
    <p style="font-size: 11px; font-weight: bold; color: #64748b; letter-spacing: 1px;">OFFICIAL SCHOOL RECORD</p>
  </div>
  
  <div style="text-align: center; margin: 15px 0;">
    <h1 style="font-family: 'Cinzel', serif; font-size: 28px; font-weight: 900; color: #1e3a8a; letter-spacing: 2px; text-transform: uppercase;">SCHOOL LEAVING CERTIFICATE</h1>
  </div>

  <div style="margin: 25px 0; width: 100%; display: flex; flex-direction: column; gap: 18px; font-size: 14px; font-weight: 500; color: #334155;">
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>1. Name of Pupil:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${leavingData.fullName}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>2. Admission No (ADM):</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${leavingData.admNo}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>3. Date of Birth (DOB):</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${leavingData.dob ? new Date(leavingData.dob).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>4. Class Left:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${leavingData.classLeft}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>5. Date of Admission:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${leavingData.dateAdmission ? new Date(leavingData.dateAdmission).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>6. Date of Leaving:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${leavingData.dateLeaving ? new Date(leavingData.dateLeaving).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>7. General Conduct:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${leavingData.conduct}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>8. Reason for Leaving:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${leavingData.reason}</span></div>
  </div>

  <div style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 10px; width: 100%; display: flex; align-items: flex-end;">
    <strong>Remarks on Progress:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-style: italic; padding-left: 8px; color: #0f172a; margin-bottom: 2px;">${leavingData.remarks}</span>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px;">
    <div style="text-align: center; width: 160px;">
      <div style="border-bottom: 1px solid #94a3b8; height: 35px;"></div>
      <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-top: 6px;">Class Teacher</p>
    </div>
    <div style="width: 90px; height: 90px; border: 2px dashed #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0.6;">
      <span style="font-size: 8px; font-weight: bold; color: #94a3b8; text-transform: uppercase; text-align: center;">Official Seal</span>
    </div>
    <div style="text-align: center; width: 180px;">
      <div style="border-bottom: 1px solid #94a3b8; height: 35px; font-weight: bold; color: #1e3a8a; display: flex; align-items: flex-end; justify-content: center; font-size: 13px;">${leavingData.principal}</div>
      <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-top: 6px;">School Principal</p>
    </div>
  </div>
</div>
            `;
        } else if (mode === 'TRANSFER') {
            certsHtml = `
<div class="cert-container" style="border: 10px double #065f46; padding: 15mm; font-family: 'Inter', sans-serif; height: 297mm; width: 210mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background: #fff; position: relative;">
  <div style="position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 2px solid #065f4666; pointer-events: none;"></div>
  
  <div style="text-align: center;">
    ${logoHtml}
    <h2 style="font-family: 'Cinzel', serif; font-size: 24px; font-weight: 900; color: #065f46; text-transform: uppercase; margin-bottom: 2px;">${schoolName}</h2>
    <p style="font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase;">Academic Transfer Document</p>
  </div>
  
  <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #334155; margin: 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
    <span>TC No: ${transferData.tcNo}</span>
    <span>Admission No (ADM): ${transferData.admNo}</span>
  </div>

  <div style="text-align: center; margin: 5px 0;">
    <h1 style="font-family: 'Cinzel', serif; font-size: 24px; font-weight: 900; color: #065f46; letter-spacing: 2px; text-transform: uppercase;">TRANSFER CERTIFICATE</h1>
  </div>

  <div style="margin: 20px 0; width: 100%; display: flex; flex-direction: column; gap: 15px; font-size: 13px; font-weight: 500; color: #334155;">
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>1. Name of Pupil:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.fullName}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>2. Father's / Mother's Name:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.parentName}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>3. Date of Birth (DOB):</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.dob ? new Date(transferData.dob).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>4. Class in which student was studying:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.classStudying}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>5. Subjects studied:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.subjects}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>6. Whether qualified for promotion:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.promotedTo}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>7. Month up to which school dues paid:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.duesPaidUpTo}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>8. Date on which student's name was struck off:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.dateStruckOff ? new Date(transferData.dateStruckOff).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>9. Reason for leaving school:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.reason}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>10. General Conduct:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${transferData.conduct}</span></div>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px;">
    <div style="text-align: center; width: 140px;">
      <div style="border-bottom: 1px solid #94a3b8; height: 35px;"></div>
      <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-top: 6px;">Prepared By</p>
    </div>
    <div style="text-align: center; width: 140px;">
      <div style="border-bottom: 1px solid #94a3b8; height: 35px;"></div>
      <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-top: 6px;">Checked By</p>
    </div>
    <div style="text-align: center; width: 180px;">
      <div style="border-bottom: 1px solid #94a3b8; height: 35px; font-weight: bold; color: #065f46; display: flex; align-items: flex-end; justify-content: center; font-size: 13px;">${transferData.principal}</div>
      <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-top: 6px;">Principal Signature</p>
    </div>
  </div>
</div>
            `;
        } else {
            let printItems = [];
            if (recipientType === "CLASS") {
                if (!selectedClassId) {
                    toast.error("Please select a class first");
                    return;
                }
                if (classStudents.length === 0) {
                    toast.error("No students in the selected class to print");
                    return;
                }
                printItems = classStudents.map(student => ({
                    recipient: student.studentName || student.name,
                    title: previewData.title,
                    body: previewData.body
                }));
            } else {
                printItems = [{
                    recipient: previewData.recipient,
                    title: previewData.title,
                    body: previewData.body
                }];
            }

            certsHtml = printItems.map((item, idx) => `
<div class="cert-container ${idx < printItems.length - 1 ? 'page-break' : ''}">
  <div class="cert-inner-border"></div>

  <!-- Header -->
  <div class="cert-header">
    ${logoHtml}
    <div class="school-title">${schoolName}</div>
  </div>

  <!-- Content -->
  <div class="cert-content">
    <h1 class="cert-title">${item.title}</h1>
    <p class="cert-subtitle">This is to certify that</p>
    <div class="recipient-name">${item.recipient}</div>
    <p class="cert-body">${item.body}</p>
  </div>

  <!-- Footer -->
  <div class="cert-footer">
    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-name">${previewData.sig1Name}</div>
      <div class="sig-desig">${previewData.sig1Desig}</div>
    </div>

    <div class="stamp-container">
      <div class="stamp-text">OFFICIAL<br/>SEAL / STAMP</div>
    </div>

    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-name">${previewData.sig2Name}</div>
      <div class="sig-desig">${previewData.sig2Desig}</div>
    </div>
  </div>
</div>
            `).join("");
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificates</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,600&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  @page {
    size: A4 ${isPortrait ? 'portrait' : 'landscape'};
    margin: 0;
  }

  body {
    font-family: 'Inter', sans-serif;
    color: #1e293b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    width: ${isPortrait ? '210mm' : '297mm'};
    height: ${isPortrait ? '297mm' : '210mm'};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cert-container {
    width: ${isPortrait ? '210mm' : '297mm'};
    height: ${isPortrait ? '297mm' : '210mm'};
    border: 16px solid ${accentColor};
    padding: 18mm 24mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    background-color: #fff;
  }

  .page-break {
    page-break-after: always;
  }

  /* Inner thin border */
  .cert-inner-border {
    position: absolute;
    top: 6px;
    left: 6px;
    right: 6px;
    bottom: 6px;
    border: 2px solid ${accentColor}dd;
    pointer-events: none;
  }

  .cert-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 5mm;
  }

  .school-title {
    font-family: 'Cinzel', serif;
    font-size: 18px;
    font-weight: 900;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .cert-content {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
    margin: 4mm 0;
  }

  .cert-title {
    font-family: 'Cinzel', serif;
    font-size: 36px;
    font-weight: 900;
    color: ${accentColor};
    letter-spacing: 4px;
    margin-bottom: 6mm;
    text-transform: uppercase;
  }

  .cert-subtitle {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-style: italic;
    color: #64748b;
    margin-bottom: 6mm;
  }

  .recipient-name {
    font-family: 'Cinzel', serif;
    font-size: 42px;
    font-weight: 900;
    color: #0f172a;
    border-bottom: 2px solid #cbd5e1;
    padding-bottom: 8px;
    margin-bottom: 6mm;
    display: inline-block;
    min-width: 60%;
  }

  .cert-body {
    font-size: 15px;
    line-height: 1.8;
    color: #334155;
    max-width: 80%;
    margin: 0 auto;
    font-weight: 500;
  }

  .cert-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0 10mm;
  }

  .signature-block {
    text-align: center;
    width: 200px;
  }

  .sig-line {
    border-bottom: 1.5px solid #64748b;
    margin-bottom: 8px;
    height: 40px;
  }

  .sig-name {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }

  .sig-desig {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 2px;
  }

  .stamp-container {
    width: 110px;
    height: 110px;
    border: 3px dashed ${accentColor}44;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
  }

  .stamp-text {
    font-size: 9px;
    font-weight: 800;
    color: ${accentColor};
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
  }
</style>
</head>
<body>

${certsHtml}

<script>
  window.onload = () => {
    const images = Array.from(document.querySelectorAll('img'));
    if (images.length === 0) {
      window.print();
      setTimeout(() => window.close(), 1000);
    } else {
      let loaded = 0;
      images.forEach(img => {
        if (img.complete) {
          loaded++;
          if (loaded === images.length) {
            window.print();
            setTimeout(() => window.close(), 1000);
          }
        } else {
          img.onload = () => {
            loaded++;
            if (loaded === images.length) {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          };
          img.onerror = () => {
            loaded++;
            if (loaded === images.length) {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          };
        }
      });
    }
  };
</script>

</body>
</html>`;

        const win = openPrintDoc();
        if (!win) {
            toast.error("Popup blocked! Please allow popups and try again.");
            return;
        }
        win.document.write(html);
        win.document.close();
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Award className="w-8 h-8 text-[#5C67F2]" />
                        Generate Certificate
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Create, customize, and print certificates for students and staff.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => {
                            setMode(mode === 'LEAVING' ? 'STANDARD' : 'LEAVING');
                            setSelectedRecipient(null);
                            setSearchQuery("");
                        }}
                        className={`h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs shadow-sm ${mode === 'LEAVING' ? 'bg-[#5C67F2] text-white hover:bg-[#4a54c4]' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <School className="w-4 h-4" /> Leaving Certificate
                    </Button>
                    <Button 
                        onClick={() => {
                            setMode(mode === 'TRANSFER' ? 'STANDARD' : 'TRANSFER');
                            setSelectedRecipient(null);
                            setSearchQuery("");
                        }}
                        className={`h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs shadow-sm ${mode === 'TRANSFER' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <RefreshCw className="w-4 h-4" /> Transfer Certificate
                    </Button>
                    
                    <Button onClick={handlePrintCurrent} className="group relative bg-white hover:bg-indigo-50 text-indigo-700 h-11 px-6 rounded-xl font-bold flex items-center gap-2 transition-all text-xs border border-indigo-200 hover:border-indigo-300 shadow-sm hover:shadow-md">
                        <Printer className="w-4 h-4" /> Print Current
                        <span className="absolute -top-2 -right-2 text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full tracking-wide shadow-sm">A4</span>
                    </Button>
                </div>
            </div>

            <div className="flex gap-8 flex-1 min-h-0">
                {/* Left Controls */}
                <div className="w-[450px] flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 custom-scrollbar pb-8">
                    
                    {/* SEARCH / RECIPIENT CONTAINER */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-400" /> 
                            {mode === 'STANDARD' ? 'Recipient Selector' : `Student Search (${mode} Cert)`}
                        </h3>

                        {mode === 'STANDARD' ? (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Recipient Type</label>
                                    <Select value={recipientType} onValueChange={(v) => {
                                        setRecipientType(v);
                                        setSearchQuery("");
                                        setSelectedRecipient(null);
                                        setSelectedClassId("");
                                        setPreviewData(prev => ({
                                            ...prev,
                                            recipient: v === "STUDENT" ? "Student Name" : v === "CLASS" ? "Class Name" : "Staff Name"
                                        }));
                                    }}>
                                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="STUDENT" className="font-bold">Student</SelectItem>
                                            <SelectItem value="EMPLOYEE" className="font-bold">Staff / Employee</SelectItem>
                                            <SelectItem value="CLASS" className="font-bold">Classwise (Bulk Students)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {recipientType === "CLASS" ? (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Select Class</label>
                                        <Select value={selectedClassId} onValueChange={(val) => {
                                            setSelectedClassId(val);
                                            const selectedClassObj = classes.find((c: any) => c._id === val);
                                            const className = selectedClassObj?.name || selectedClassObj?.levelName || "";
                                            setPreviewData(p => ({
                                                ...p,
                                                recipient: `Students of ${className}`
                                            }));
                                        }}>
                                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700">
                                                <SelectValue placeholder="Choose a Class..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {classes.map((cls: any) => (
                                                    <SelectItem key={cls._id} value={cls._id} className="font-bold">
                                                        {cls.levelName || cls.name || "—"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Search Recipient</label>
                                        <div className="relative">
                                            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                                            <Input 
                                                placeholder={recipientType === "STUDENT" ? "Search name or ADM no..." : "Search staff name..."} 
                                                value={searchQuery}
                                                onChange={e => {
                                                    setSearchQuery(e.target.value);
                                                    setShowResults(true);
                                                }}
                                                onFocus={() => setShowResults(true)}
                                                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                                className="pl-10 h-11 rounded-xl bg-slate-50 border-none font-medium" 
                                            />
                                        </div>
                                        {showResults && searchQuery.trim() !== "" && (
                                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar p-2">
                                                {filteredRecipients.length === 0 ? (
                                                    <div className="p-3 text-xs font-bold text-slate-400 text-center">
                                                        No matches found
                                                    </div>
                                                ) : (
                                                    filteredRecipients.map((r: any) => {
                                                        const name = r.studentName || r.employeeName || r.name;
                                                        const subText = recipientType === "STUDENT" 
                                                            ? `ADM: ${r.registrationNo || 'N/A'} · ${r.studentClass || ''}`
                                                            : r.designation || 'Staff';
                                                        return (
                                                            <button
                                                                key={r._id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedRecipient(r);
                                                                    setPreviewData(prev => ({
                                                                        ...prev,
                                                                        recipient: name
                                                                    }));
                                                                    setSearchQuery(name);
                                                                    setShowResults(false);
                                                                }}
                                                                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex flex-col gap-0.5"
                                                            >
                                                                <span className="text-xs font-black text-slate-800">{name}</span>
                                                                <span className="text-[10px] font-bold text-slate-400">{subText}</span>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Search recipient for Leaving & Transfer modes
                            <div className="space-y-1.5 relative">
                                <label className="text-xs font-bold text-slate-500 uppercase">Search Student</label>
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search student name or ADM no..." 
                                        value={searchQuery}
                                        onChange={e => {
                                            setSearchQuery(e.target.value);
                                            setShowResults(true);
                                        }}
                                        onFocus={() => setShowResults(true)}
                                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                        className="pl-10 h-11 rounded-xl bg-slate-50 border-none font-medium" 
                                    />
                                </div>
                                {showResults && searchQuery.trim() !== "" && (
                                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar p-2">
                                        {filteredRecipients.length === 0 ? (
                                            <div className="p-3 text-xs font-bold text-slate-400 text-center">
                                                No students found
                                            </div>
                                        ) : (
                                            filteredRecipients.map((r: any) => {
                                                const name = r.studentName || r.name;
                                                const subText = `ADM: ${r.registrationNo || 'N/A'} · ${r.studentClass || ''}`;
                                                return (
                                                    <button
                                                        key={r._id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedRecipient(r);
                                                            if (mode === 'LEAVING') {
                                                                setLeavingData(prev => ({
                                                                    ...prev,
                                                                    fullName: name,
                                                                    admNo: r.registrationNo || "",
                                                                    classLeft: r.studentClass || "",
                                                                }));
                                                            } else {
                                                                setTransferData(prev => ({
                                                                    ...prev,
                                                                    fullName: name,
                                                                    admNo: r.registrationNo || "",
                                                                    classStudying: r.studentClass || "",
                                                                }));
                                                            }
                                                            setSearchQuery(name);
                                                            setShowResults(false);
                                                        }}
                                                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex flex-col gap-0.5"
                                                    >
                                                        <span className="text-xs font-black text-slate-800">{name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{subText}</span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* DYNAMIC EDIT FIELDS */}
                    {mode === 'STANDARD' && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" /> Standard Certificate Details
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Certificate Type</label>
                                    <Select value={certType} onValueChange={setCertType}>
                                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="ACHIEVEMENT" className="font-bold">Achievement</SelectItem>
                                            <SelectItem value="COMPLETION" className="font-bold">Completion</SelectItem>
                                            <SelectItem value="PARTICIPATION" className="font-bold">Participation</SelectItem>
                                            <SelectItem value="MERIT" className="font-bold">Merit</SelectItem>
                                            <SelectItem value="SPORTS" className="font-bold">Sports</SelectItem>
                                            <SelectItem value="CUSTOM" className="font-bold">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Certificate Title</label>
                                    <Input 
                                        value={previewData.title} 
                                        onChange={e => setPreviewData(p => ({...p, title: e.target.value}))} 
                                        className="h-11 rounded-xl font-bold border-slate-200" 
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Body / Citation</label>
                                    <Textarea 
                                        value={previewData.body} 
                                        onChange={(e: any) => setPreviewData(p => ({...p, body: e.target.value}))} 
                                        className="min-h-[100px] rounded-xl font-medium border-slate-200 resize-none p-3 text-sm leading-relaxed" 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Signatory 1</label>
                                        <Input value={previewData.sig1Name} onChange={e => setPreviewData(p => ({...p, sig1Name: e.target.value}))} className="h-9 rounded-lg text-xs font-bold border-slate-200" />
                                        <Input value={previewData.sig1Desig} onChange={e => setPreviewData(p => ({...p, sig1Desig: e.target.value}))} className="h-9 rounded-lg text-xs border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Signatory 2</label>
                                        <Input value={previewData.sig2Name} onChange={e => setPreviewData(p => ({...p, sig2Name: e.target.value}))} className="h-9 rounded-lg text-xs font-bold border-slate-200" />
                                        <Input value={previewData.sig2Desig} onChange={e => setPreviewData(p => ({...p, sig2Desig: e.target.value}))} className="h-9 rounded-lg text-xs border-slate-200" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'LEAVING' && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-300">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[#5C67F2] flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Leaving Cert Details
                            </h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Pupil Name</label>
                                        <Input value={leavingData.fullName} onChange={e => setLeavingData(p => ({...p, fullName: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Adm No</label>
                                        <Input value={leavingData.admNo} onChange={e => setLeavingData(p => ({...p, admNo: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Class Left</label>
                                        <Input value={leavingData.classLeft} onChange={e => setLeavingData(p => ({...p, classLeft: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                                        <Input type="date" value={leavingData.dob} onChange={e => setLeavingData(p => ({...p, dob: e.target.value}))} className="h-11 rounded-xl font-medium border-slate-200" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Date Adm</label>
                                        <Input type="date" value={leavingData.dateAdmission} onChange={e => setLeavingData(p => ({...p, dateAdmission: e.target.value}))} className="h-11 rounded-xl font-medium border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Date Leaving</label>
                                        <Input type="date" value={leavingData.dateLeaving} onChange={e => setLeavingData(p => ({...p, dateLeaving: e.target.value}))} className="h-11 rounded-xl font-medium border-slate-200" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Reason for Leaving</label>
                                    <Input value={leavingData.reason} onChange={e => setLeavingData(p => ({...p, reason: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Conduct</label>
                                        <Select value={leavingData.conduct} onValueChange={(val) => setLeavingData(p => ({...p, conduct: val}))}>
                                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="Excellent" className="font-bold">Excellent</SelectItem>
                                                <SelectItem value="Very Good" className="font-bold">Very Good</SelectItem>
                                                <SelectItem value="Good" className="font-bold">Good</SelectItem>
                                                <SelectItem value="Satisfactory" className="font-bold">Satisfactory</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Principal</label>
                                        <Input value={leavingData.principal} onChange={e => setLeavingData(p => ({...p, principal: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Remarks on Progress</label>
                                    <Textarea value={leavingData.remarks} onChange={e => setLeavingData(p => ({...p, remarks: e.target.value}))} className="min-h-[80px] rounded-xl font-medium border-slate-200 p-3 text-sm resize-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'TRANSFER' && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-300">
                            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Transfer Cert Details
                            </h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">TC Serial No</label>
                                        <Input value={transferData.tcNo} onChange={e => setTransferData(p => ({...p, tcNo: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Adm No</label>
                                        <Input value={transferData.admNo} onChange={e => setTransferData(p => ({...p, admNo: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Pupil Name</label>
                                        <Input value={transferData.fullName} onChange={e => setTransferData(p => ({...p, fullName: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Parent's Name</label>
                                        <Input value={transferData.parentName} onChange={e => setTransferData(p => ({...p, parentName: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                                        <Input type="date" value={transferData.dob} onChange={e => setTransferData(p => ({...p, dob: e.target.value}))} className="h-11 rounded-xl font-medium border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Class Studying</label>
                                        <Input value={transferData.classStudying} onChange={e => setTransferData(p => ({...p, classStudying: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Subjects Studied</label>
                                    <Input value={transferData.subjects} onChange={e => setTransferData(p => ({...p, subjects: e.target.value}))} className="h-11 rounded-xl font-medium border-slate-200 text-sm" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Promotion Status</label>
                                        <Input value={transferData.promotedTo} onChange={e => setTransferData(p => ({...p, promotedTo: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Dues Paid Up To</label>
                                        <Input value={transferData.duesPaidUpTo} onChange={e => setTransferData(p => ({...p, duesPaidUpTo: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200 text-sm" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Date Struck Off</label>
                                        <Input type="date" value={transferData.dateStruckOff} onChange={e => setTransferData(p => ({...p, dateStruckOff: e.target.value}))} className="h-11 rounded-xl font-medium border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Date of Issue</label>
                                        <Input type="date" value={transferData.dateIssue} onChange={e => setTransferData(p => ({...p, dateIssue: e.target.value}))} className="h-11 rounded-xl font-medium border-slate-200" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Reason for Leaving</label>
                                        <Input value={transferData.reason} onChange={e => setTransferData(p => ({...p, reason: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Principal</label>
                                        <Input value={transferData.principal} onChange={e => setTransferData(p => ({...p, principal: e.target.value}))} className="h-11 rounded-xl font-bold border-slate-200" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button 
                        onClick={handleGenerate}
                        disabled={createMutation.isPending}
                        className={`w-full text-white h-12 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-all shrink-0 ${mode === 'TRANSFER' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#5C67F2] hover:bg-[#4a54c4]'}`}
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                <Award className="w-4 h-4" /> Save & Generate
                            </>
                        )}
                    </Button>
                </div>

                {/* Right Preview */}
                <div className="flex-1 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center p-8 relative overflow-y-auto custom-scrollbar h-full min-h-[500px]">
                    
                    {mode === 'LEAVING' && (
                        <div className="w-full max-w-[500px] aspect-[0.707] bg-white shadow-2xl relative p-8 flex flex-col justify-between animate-in zoom-in-95 duration-300" style={{ border: `12px double #1e3a8a` }}>
                            <div style={{ position: 'absolute', top: '5px', left: '5px', right: '5px', bottom: '5px', border: '2px solid #1e3a8a44', pointerEvents: 'none' }}></div>
                            
                            <div className="text-center mt-2">
                                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">{schoolName}</h2>
                                <p className="text-[9px] font-bold text-slate-400 tracking-wider">OFFICIAL SCHOOL RECORD</p>
                                <h1 className="text-xl font-black text-[#1e3a8a] tracking-widest mt-4 mb-2">SCHOOL LEAVING CERTIFICATE</h1>
                            </div>

                            <div className="flex flex-col gap-3 text-xs font-semibold text-slate-600 my-4">
                                <div className="flex justify-between items-end"><span>1. Pupil Name:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{leavingData.fullName}</span></div>
                                <div className="flex justify-between items-end"><span>2. Adm No (ADM):</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{leavingData.admNo}</span></div>
                                <div className="flex justify-between items-end"><span>3. Date of Birth:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{leavingData.dob ? new Date(leavingData.dob).toLocaleDateString() : '—'}</span></div>
                                <div className="flex justify-between items-end"><span>4. Class Left:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{leavingData.classLeft}</span></div>
                                <div className="flex justify-between items-end"><span>5. Date Admission:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{leavingData.dateAdmission ? new Date(leavingData.dateAdmission).toLocaleDateString() : '—'}</span></div>
                                <div className="flex justify-between items-end"><span>6. Date Leaving:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{leavingData.dateLeaving ? new Date(leavingData.dateLeaving).toLocaleDateString() : '—'}</span></div>
                                <div className="flex justify-between items-end"><span>7. General Conduct:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{leavingData.conduct}</span></div>
                                <div className="flex justify-between items-end"><span>8. Reason:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{leavingData.reason}</span></div>
                            </div>

                            <div className="text-xs text-slate-600 font-semibold mb-4 flex items-end">
                                <span>Remarks:</span> <span className="italic text-slate-800 ml-1 font-bold border-b border-dotted border-slate-300 flex-grow text-right">{leavingData.remarks}</span>
                            </div>

                            <div className="flex justify-between items-end mb-2">
                                <div className="text-center w-28">
                                    <div className="border-b border-slate-300 mb-1 h-6"></div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Class Teacher</p>
                                </div>
                                <div className="w-14 h-14 rounded-full border border-dashed border-slate-200 flex items-center justify-center opacity-60">
                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-center">Seal</span>
                                </div>
                                <div className="text-center w-28">
                                    <p className="text-[10px] font-bold text-slate-800 border-b border-slate-300 mb-1 pb-0.5">{leavingData.principal}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">School Principal</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'TRANSFER' && (
                        <div className="w-full max-w-[500px] aspect-[0.707] bg-white shadow-2xl relative p-8 flex flex-col justify-between animate-in zoom-in-95 duration-300" style={{ border: `12px double #065f46` }}>
                            <div style={{ position: 'absolute', top: '5px', left: '5px', right: '5px', bottom: '5px', border: '2px solid #065f4644', pointerEvents: 'none' }}></div>
                            
                            <div className="text-center mt-1">
                                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">{schoolName}</h2>
                                <p className="text-[9px] font-bold text-slate-400 tracking-wider">ACADEMIC TRANSFER DOCUMENT</p>
                                <h1 className="text-2xl font-black text-[#065f46] tracking-widest mt-2 mb-1">TRANSFER CERTIFICATE</h1>
                            </div>

                            <div className="flex justify-between text-[9px] font-bold text-slate-400 border-b border-slate-100 pb-1 mb-2">
                                <span>TC No: {transferData.tcNo}</span>
                                <span>Admission No (ADM): {transferData.admNo}</span>
                            </div>

                            <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-600 my-2">
                                <div className="flex justify-between items-end"><span>1. Name of Pupil:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{transferData.fullName}</span></div>
                                <div className="flex justify-between items-end"><span>2. Parent/Guardian Name:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{transferData.parentName}</span></div>
                                <div className="flex justify-between items-end"><span>3. Date of Birth:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{transferData.dob ? new Date(transferData.dob).toLocaleDateString() : '—'}</span></div>
                                <div className="flex justify-between items-end"><span>4. Class Studying:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{transferData.classStudying}</span></div>
                                <div className="flex justify-between items-end"><span>5. Subjects Studied:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right text-[10px]">{transferData.subjects}</span></div>
                                <div className="flex justify-between items-end"><span>6. Promotion Status:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{transferData.promotedTo}</span></div>
                                <div className="flex justify-between items-end"><span>7. Dues Paid Status:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{transferData.duesPaidUpTo}</span></div>
                                <div className="flex justify-between items-end"><span>8. Struck off rolls Date:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{transferData.dateStruckOff ? new Date(transferData.dateStruckOff).toLocaleDateString() : '—'}</span></div>
                                <div className="flex justify-between items-end"><span>9. Reason for leaving:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{transferData.reason}</span></div>
                                <div className="flex justify-between items-end"><span>10. General Conduct:</span> <span className="border-b border-dotted border-slate-300 flex-grow font-extrabold text-slate-900 ml-1 text-right">{transferData.conduct}</span></div>
                            </div>

                            <div className="flex justify-between items-end mb-2 mt-4">
                                <div className="text-center w-24">
                                    <div className="border-b border-slate-300 mb-1 h-6"></div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Prepared By</p>
                                </div>
                                <div className="text-center w-24">
                                    <div className="border-b border-slate-300 mb-1 h-6"></div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Checked By</p>
                                </div>
                                <div className="text-center w-32">
                                    <p className="text-[10px] font-bold text-slate-800 border-b border-slate-300 mb-1 pb-0.5">{transferData.principal}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Principal Signature</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'STANDARD' && (
                        <>
                            {!activeTemplate ? (
                                <div className="text-center space-y-3 animate-in fade-in duration-300">
                                    <Award className="w-12 h-12 text-slate-300 mx-auto" />
                                    <p className="text-sm font-bold text-slate-500">No active template selected.<br/>Go to Certificate Templates to activate one.</p>
                                </div>
                            ) : (
                                <div className="w-full max-w-[800px] aspect-[1.414] bg-white shadow-2xl relative p-12 flex flex-col justify-between animate-in zoom-in-95 duration-300" style={{ border: `12px solid ${activeTemplate.accent_color || '#1e3a8a'}` }}>
                                    <div className="text-center mt-8">
                                        <h2 className="text-4xl font-black uppercase tracking-widest mb-6" style={{ color: activeTemplate.accent_color || '#1e3a8a' }}>
                                            {previewData.title}
                                        </h2>
                                        <p className="text-lg font-medium text-slate-600 mb-8 italic">This is to certify that</p>
                                        <h1 className="text-5xl font-black text-slate-900 mb-8 border-b-2 border-slate-200 inline-block px-12 pb-2">
                                            {previewName}
                                        </h1>
                                        <p className="text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto font-medium">
                                            {previewData.body}
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-end mb-8 px-12">
                                        <div className="text-center w-48">
                                            <div className="border-b-2 border-slate-400 mb-2 h-12"></div>
                                            <p className="text-sm font-bold text-slate-900">{previewData.sig1Name}</p>
                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{previewData.sig1Desig}</p>
                                        </div>
                                        
                                        <div className="w-32 h-32 rounded-full border-4 border-dashed border-rose-200 flex items-center justify-center opacity-50">
                                            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest text-center">School<br/>Stamp</span>
                                        </div>

                                        <div className="text-center w-48">
                                            <div className="border-b-2 border-slate-400 mb-2 h-12"></div>
                                            <p className="text-sm font-bold text-slate-900">{previewData.sig2Name}</p>
                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{previewData.sig2Desig}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
