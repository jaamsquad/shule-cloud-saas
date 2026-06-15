import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

/** Real school branding for report headers/prints — same source as the top header. */
export function useReportSchool() {
  const { data } = useQuery({
    queryKey: ["tenant_profile_global"],   // shares the top header's cache
    queryFn: async () => {
      const r = await api.get("/auth/tenant/profile");
      return Array.isArray(r.data) ? r.data[0] : r.data;
    },
  });
  const s: any = data || {};
  return {
    name: s?.name || s?.instituteName || s?.schoolName || "School",
    logo: s?.logo || s?.schoolLogo || s?.image || "",
    address: [s?.address || s?.location, s?.city || s?.county].filter(Boolean).join(", "),
    phone: s?.phone || s?.contactPhone || s?.mobile || "",
    email: s?.email || s?.contactEmail || "",
  };
}
