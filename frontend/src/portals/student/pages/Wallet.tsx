import { useOutletContext } from "react-router-dom";
import WalletView from "../../WalletView";
import { PORTAL_THEME } from "../../theme";
import type { StudentCtx } from "../StudentLayout";

export default function Wallet() {
    const { api } = useOutletContext<StudentCtx>();
    return <WalletView api={api} base="/student-portal" canPayFees accent={PORTAL_THEME.student.accent} />;
}
