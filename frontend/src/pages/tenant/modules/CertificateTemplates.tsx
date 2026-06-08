import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Award, CheckCircle2, Image as ImageIcon, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CertificateTemplates() {
    const queryClient = useQueryClient();

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['certificate_templates'],
        queryFn: async () => {
            const res = await api.get('/certificate-templates');
            return res.data.data;
        }
    });

    const activateMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/certificate-templates/${id}/activate`);
        },
        onSuccess: () => {
            toast.success("Template activated successfully!");
            queryClient.invalidateQueries({ queryKey: ['certificate_templates'] });
        }
    });

    return (
        <div className="w-full max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Award className="w-8 h-8 text-indigo-600" />
                        Certificate Templates
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Choose the active design for your institution's certificates.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="h-11 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Upload Custom
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((tpl: any) => (
                        <div key={tpl._id} className={`group relative bg-white rounded-3xl overflow-hidden border-2 transition-all duration-300 ${tpl.is_active ? 'border-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-100 hover:border-slate-300 hover:shadow-lg'}`}>
                            {tpl.is_active && (
                                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg shadow-indigo-200">
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    ACTIVE
                                </div>
                            )}
                            
                            <div className="h-48 relative overflow-hidden" style={{ background: tpl.accent_color }}>
                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                                <div className="absolute inset-4 bg-white/95 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
                                    <h3 className="text-xl font-black text-slate-900 mb-2" style={{ color: tpl.accent_color }}>{tpl.name}</h3>
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">CERTIFICATE OF ACHIEVEMENT</p>
                                    <div className="w-16 h-0.5 mt-4 opacity-50" style={{ background: tpl.accent_color }} />
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black tracking-widest uppercase text-slate-400">{tpl.badge}</span>
                                </div>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed min-h-[40px]">
                                    {tpl.description}
                                </p>
                                <Button 
                                    onClick={() => activateMutation.mutate(tpl._id)}
                                    disabled={tpl.is_active || activateMutation.isPending}
                                    className={`w-full h-12 rounded-xl font-bold shadow-none transition-all ${tpl.is_active ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50' : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'}`}
                                >
                                    {tpl.is_active ? (
                                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Currently Active</span>
                                    ) : "Use This Template"}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
