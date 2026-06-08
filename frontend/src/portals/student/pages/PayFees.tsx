import { useOutletContext } from "react-router-dom";
import FeesPay from "../../FeesPay";
import type { StudentCtx } from "../StudentLayout";

export default function PayFees() {
    const { api } = useOutletContext<StudentCtx>();
    return <FeesPay api={api} base="/student-portal" title="Pay Fees" />;
}
