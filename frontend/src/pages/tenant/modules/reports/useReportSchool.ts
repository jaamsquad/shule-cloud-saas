import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

/** Real school branding for report headers/prints (same source as the top header). */
export function useReportSchool() {
  const { data } = useQuery({
    queryKey: ["theme_settings"],
    queryFn: async () => (await api.get("/theme_settings")).data,
  });
  const s: any = Array.isArray(data) ? data[0] : (data || {});
  return {
    name: s?.name || s?.instituteName || s?.schoolName || "School",
    logo: s?.logo || s?.schoolLogo || s?.image || "",
    address: [s?.address || s?.location, s?.city || s?.county].filter(Boolean).join(", "),
    phone: s?.phone || s?.contactPhone || s?.mobile || "",
    email: s?.email || s?.contactEmail || "",
  };
}
