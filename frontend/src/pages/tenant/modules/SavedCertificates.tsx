import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Award, Search, Printer, CheckCircle, Ban, Trash2, Calendar, User, ShieldAlert, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { openPrintDoc } from "@/lib/pdfDoc";

export default function SavedCertificates() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteRecipient, setDeleteRecipient] = useState<string>("");

    // Fetch saved certificates
    const { data: certificates = [], isLoading } = useQuery<any[]>({
        queryKey: ['saved_certificates'],
        queryFn: async () => {
            const res = await api.get('/certificates');
            return res.data.data || [];
        }
    });

    // Fetch active template for print styling
    const { data: activeTemplate } = useQuery({
        queryKey: ['certificate_templates', 'active'],
        queryFn: async () => {
            const res = await api.get('/certificate-templates/active');
            return res.data.data;
        }
    });

    // Fetch school/tenant info for printing
    const { data: tenantProfile } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
    });

    const schoolName = tenantProfile?.name || tenantProfile?.schoolName || tenantProfile?.instituteName || "INSTITUTION NAME";
    const schoolLogo = tenantProfile?.logo || tenantProfile?.logoUrl || "";

    // Mutations
    const issueMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/certificates/${id}/issue`);
        },
        onSuccess: () => {
            toast.success("Certificate issued successfully!");
            queryClient.invalidateQueries({ queryKey: ['saved_certificates'] });
        }
    });

    const revokeMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/certificates/${id}/revoke`);
        },
        onSuccess: () => {
            toast.success("Certificate revoked successfully.");
            queryClient.invalidateQueries({ queryKey: ['saved_certificates'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/certificates/${id}`);
        },
        onSuccess: () => {
            toast.success("Certificate deleted successfully.");
            queryClient.invalidateQueries({ queryKey: ['saved_certificates'] });
        }
    });

    const handlePrint = (cert: any) => {
        const accentColor = activeTemplate?.accent_color || '#1e3a8a';
        const logoHtml = schoolLogo
            ? `<img src="${schoolLogo}" style="height: 60px; object-fit: contain; margin-bottom: 8px;" />`
            : `<div style="font-size: 32px; margin-bottom: 8px;">🎓</div>`;

        const isLeaving = cert.certificateType === "LEAVING";
        const isTransfer = cert.certificateType === "TRANSFER";
        const isPortrait = isLeaving || isTransfer;

        let certHtml = "";

        if (isLeaving) {
            let data: any = {};
            try { data = JSON.parse(cert.body); } catch (e) { data = {}; }
            certHtml = `
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
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>1. Name of Pupil:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.fullName || cert.recipientName}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>2. Admission No (ADM):</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.admNo || 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>3. Date of Birth (DOB):</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.dob ? new Date(data.dob).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>4. Class Left:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.classLeft || 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>5. Date of Admission:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.dateAdmission ? new Date(data.dateAdmission).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>6. Date of Leaving:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.dateLeaving ? new Date(data.dateLeaving).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>7. General Conduct:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.conduct || 'Excellent'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>8. Reason for Leaving:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.reason || 'N/A'}</span></div>
  </div>

  <div style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 10px; width: 100%; display: flex; align-items: flex-end;">
    <strong>Remarks on Progress:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-style: italic; padding-left: 8px; color: #0f172a; margin-bottom: 2px;">${data.remarks || 'Satisfactory progress in all academic areas.'}</span>
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
      <div style="border-bottom: 1px solid #94a3b8; height: 35px; font-weight: bold; color: #1e3a8a; display: flex; align-items: flex-end; justify-content: center; font-size: 13px;">${data.principal || cert.sig1Name}</div>
      <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-top: 6px;">School Principal</p>
    </div>
  </div>
</div>
            `;
        } else if (isTransfer) {
            let data: any = {};
            try { data = JSON.parse(cert.body); } catch (e) { data = {}; }
            certHtml = `
<div class="cert-container" style="border: 10px double #065f46; padding: 15mm; font-family: 'Inter', sans-serif; height: 297mm; width: 210mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background: #fff; position: relative;">
  <div style="position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 2px solid #065f4666; pointer-events: none;"></div>
  
  <div style="text-align: center;">
    ${logoHtml}
    <h2 style="font-family: 'Cinzel', serif; font-size: 24px; font-weight: 900; color: #065f46; text-transform: uppercase; margin-bottom: 2px;">${schoolName}</h2>
    <p style="font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase;">Academic Transfer Document</p>
  </div>
  
  <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #334155; margin: 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
    <span>TC No: ${data.tcNo || 'TC/N/A'}</span>
    <span>Admission No (ADM): ${data.admNo || 'N/A'}</span>
  </div>

  <div style="text-align: center; margin: 5px 0;">
    <h1 style="font-family: 'Cinzel', serif; font-size: 24px; font-weight: 900; color: #065f46; letter-spacing: 2px; text-transform: uppercase;">TRANSFER CERTIFICATE</h1>
  </div>

  <div style="margin: 20px 0; width: 100%; display: flex; flex-direction: column; gap: 15px; font-size: 13px; font-weight: 500; color: #334155;">
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>1. Name of Pupil:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.fullName || cert.recipientName}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>2. Father's / Mother's Name:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.parentName || 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>3. Date of Birth (DOB):</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.dob ? new Date(data.dob).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>4. Class in which student was studying:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.classStudying || 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>5. Subjects studied:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.subjects || 'All standard subjects'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>6. Whether qualified for promotion:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.promotedTo || 'Yes'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>7. Month up to which school dues paid:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.duesPaidUpTo || 'Fully Cleared'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>8. Date on which student's name was struck off:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.dateStruckOff ? new Date(data.dateStruckOff).toLocaleDateString() : 'N/A'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>9. Reason for leaving school:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.reason || 'Course Completion'}</span></div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong>10. General Conduct:</strong> <span style="border-bottom: 1.5px dotted #94a3b8; flex-grow: 1; font-weight: 700; color: #0f172a; padding-left: 8px; margin-bottom: 2px;">${data.conduct || 'Good'}</span></div>
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
      <div style="border-bottom: 1px solid #94a3b8; height: 35px; font-weight: bold; color: #065f46; display: flex; align-items: flex-end; justify-content: center; font-size: 13px;">${data.principal || cert.sig1Name}</div>
      <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-top: 6px;">Principal Signature</p>
    </div>
  </div>
</div>
            `;
        } else {
            certHtml = `
<div class="cert-container">
  <div class="cert-inner-border"></div>

  <!-- Header -->
  <div class="cert-header">
    ${logoHtml}
    <div class="school-title">${schoolName}</div>
  </div>

  <!-- Content -->
  <div class="cert-content">
    <h1 class="cert-title">${cert.title}</h1>
    <p class="cert-subtitle">This is to certify that</p>
    <div class="recipient-name">${cert.recipientName}</div>
    <p class="cert-body">${cert.body}</p>
  </div>

  <!-- Footer -->
  <div class="cert-footer">
    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-name">${cert.sig1Name || ''}</div>
      <div class="sig-desig">${cert.sig1Desig || ''}</div>
    </div>

    <div class="stamp-container">
      <div class="stamp-text">OFFICIAL<br/>SEAL / STAMP</div>
    </div>

    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-name">${cert.sig2Name || ''}</div>
      <div class="sig-desig">${cert.sig2Desig || ''}</div>
    </div>
  </div>
</div>
            `;
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate - ${cert.recipientName}</title>
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

${certHtml}

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

    // Filter logic
    const filteredCertificates = certificates.filter(cert => {
        const matchesSearch = 
            (cert.recipientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cert.title || "").toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "ALL" || cert.status === statusFilter;
        const matchesType = typeFilter === "ALL" || cert.certificateType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ISSUED':
                return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> ISSUED</span>;
            case 'REVOKED':
                return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><Ban className="w-3.5 h-3.5" /> REVOKED</span>;
            default:
                return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> DRAFT</span>;
        }
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    <Award className="w-8 h-8 text-indigo-600" />
                    Saved Certificates
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-2">
                    Manage, issue, revoke, and print previously generated certificates.
                </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex-1 min-w-[280px] relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Search by recipient name or title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 rounded-xl bg-slate-50 border-none font-medium text-sm"
                    />
                </div>

                <div className="w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700 text-sm">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL" className="font-bold">All Statuses</SelectItem>
                            <SelectItem value="DRAFT" className="font-bold">Draft</SelectItem>
                            <SelectItem value="ISSUED" className="font-bold">Issued</SelectItem>
                            <SelectItem value="REVOKED" className="font-bold">Revoked</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-48">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700 text-sm">
                            <SelectValue placeholder="Filter Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL" className="font-bold">All Types</SelectItem>
                            <SelectItem value="ACHIEVEMENT" className="font-bold">Achievement</SelectItem>
                            <SelectItem value="COMPLETION" className="font-bold">Completion</SelectItem>
                            <SelectItem value="PARTICIPATION" className="font-bold">Participation</SelectItem>
                            <SelectItem value="MERIT" className="font-bold">Merit</SelectItem>
                            <SelectItem value="SPORTS" className="font-bold">Sports</SelectItem>
                            <SelectItem value="CUSTOM" className="font-bold">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* List/Grid of saved certificates */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
            ) : filteredCertificates.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
                    <Award className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-lg font-black text-slate-800">No Certificates Found</h3>
                    <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">
                        There are no generated certificates matching your filters.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCertificates.map((cert) => {
                        const accent = activeTemplate?.accent_color || '#1e3a8a';
                        return (
                            <div key={cert._id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: accent }} />
                                
                                <div className="space-y-4 pl-2">
                                    <div className="flex justify-between items-start">
                                        {getStatusBadge(cert.status)}
                                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                                            {cert.certificateType}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="font-black text-slate-900 text-lg leading-snug line-clamp-1">{cert.title}</h3>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-1">
                                            <User className="w-3.5 h-3.5 text-slate-300" />
                                            <span>{cert.recipientName}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
                                        {cert.body}
                                    </p>

                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold border-t border-slate-100 pt-3">
                                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                        <span>Generated on {new Date(cert.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-6 pl-2">
                                    <Button 
                                        onClick={() => handlePrint(cert)}
                                        className="flex-1 h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <Printer className="w-3.5 h-3.5" /> Print
                                    </Button>

                                    {cert.status !== 'ISSUED' && (
                                        <Button
                                            onClick={() => issueMutation.mutate(cert._id)}
                                            disabled={issueMutation.isPending}
                                            variant="outline"
                                            className="h-10 px-3 rounded-xl border-slate-200 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 shadow-sm"
                                            title="Issue Certificate"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </Button>
                                    )}

                                    {cert.status === 'ISSUED' && (
                                        <Button
                                            onClick={() => revokeMutation.mutate(cert._id)}
                                            disabled={revokeMutation.isPending}
                                            variant="outline"
                                            className="h-10 px-3 rounded-xl border-slate-200 text-amber-600 hover:text-amber-700 hover:bg-amber-50/50 shadow-sm"
                                            title="Revoke Certificate"
                                        >
                                            <Ban className="w-4 h-4" />
                                        </Button>
                                    )}

                                    <Button
                                        onClick={() => {
                                            setDeleteId(cert._id);
                                            setDeleteRecipient(cert.recipientName);
                                        }}
                                        disabled={deleteMutation.isPending}
                                        variant="outline"
                                        className="h-10 px-3 rounded-xl border-slate-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50 shadow-sm"
                                        title="Delete Certificate"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 max-w-md w-full mx-4 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 text-rose-600">
                            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                                <Trash2 className="w-6 h-6" strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Delete Certificate</h3>
                                <p className="text-xs font-bold text-slate-400 mt-0.5">This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="text-sm font-semibold text-slate-600 leading-relaxed">
                            Are you sure you want to delete the certificate for <strong className="text-slate-900 font-extrabold">{deleteRecipient}</strong>? All records of this generation will be permanently removed.
                        </p>

                        <div className="flex items-center gap-3 pt-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setDeleteId(null)}
                                className="flex-1 h-11 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={() => {
                                    deleteMutation.mutate(deleteId);
                                    setDeleteId(null);
                                }}
                                className="flex-1 h-11 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 transition-colors"
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
