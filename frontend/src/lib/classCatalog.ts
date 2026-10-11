/**
 * The built-in grade/level list as the school sees it (Classes → Classes we offer).
 */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface CatalogClass { key: string; name: string; curriculumType: string; level: number; group: string; offered: boolean; classId: string | null }
export interface ClassCatalog { groups: string[]; classes: CatalogClass[]; custom: { _id: string; name: string; curriculumType: string }[] }

export const useClassCatalog = () => useQuery<ClassCatalog>({ queryKey: ["class_catalog"], queryFn: async () => (await api.get("/class-catalog")).data });
