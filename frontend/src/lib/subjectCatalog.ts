/**
 * The built-in subject list as the school sees it (Subjects → Subjects we offer).
 */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface CatalogSubject { key: string; name: string; short: string; code?: string; group: string; offered: boolean; subjectId: string | null }
export interface Catalog { groups: string[]; subjects: CatalogSubject[]; custom: { _id: string; name: string; code: string; category: string }[] }

export const useSubjectCatalog = () => useQuery<Catalog>({ queryKey: ["subject_catalog"], queryFn: async () => (await api.get("/subject-catalog")).data });
