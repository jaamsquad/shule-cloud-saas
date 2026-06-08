import { useOutletContext } from "react-router-dom";
import WalletView from "../../WalletView";
import { PORTAL_THEME } from "../../theme";
import type { ParentCtx } from "../ParentLayout";

// Parent manages the selected child's wallet (parentApi sends x-student-id).
export default function ParentWallet() {
    const { api } = useOutletContext<ParentCtx>();
    return <WalletView api={api} base="/parent-portal" canManage accent={PORTAL_THEME.parent.accent} />;
}
