import { useOutletContext } from "react-router-dom";
import FeesPay from "../../FeesPay";
import type { ParentCtx } from "../ParentLayout";

// Scoped to the currently selected child (parentApi sends x-student-id).
export default function ParentFees() {
    const { api, child } = useOutletContext<ParentCtx>();
    return <FeesPay api={api} base="/parent-portal" title={`Fees — ${child?.name || "Child"}`} />;
}
