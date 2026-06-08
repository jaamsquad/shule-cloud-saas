import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

export interface Branding { name: string; logo: string | null }

// Fetches the institution name + logo for the current subdomain. Token-free
// (resolved from the tenant subdomain), so it works on login pages too.
export function useBranding(api: AxiosInstance) {
    return useQuery({
        queryKey: ["portal_branding"],
        queryFn: async () => (await api.get("/portal/branding")).data as Branding,
        retry: false,
        staleTime: 10 * 60 * 1000,
    });
}
