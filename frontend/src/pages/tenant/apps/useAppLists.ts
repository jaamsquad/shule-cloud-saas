import { useEffect, useState } from "react";
import { recentApps, starredApps } from "@/lib/apps";

/** Recently used and starred app keys, kept in sync across the page. */
export function useAppLists() {
    const [recent, setRecent] = useState<string[]>(recentApps);
    const [starred, setStarred] = useState<string[]>(starredApps);
    useEffect(() => {
        const sync = () => { setRecent(recentApps()); setStarred(starredApps()); };
        window.addEventListener("sc-apps-changed", sync);
        window.addEventListener("storage", sync);
        return () => { window.removeEventListener("sc-apps-changed", sync); window.removeEventListener("storage", sync); };
    }, []);
    return { recent, starred };
}
