import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PortalLogin from "../PortalLogin";
import { tenantDisplayName } from "../portal";
import { PORTAL_THEME } from "../theme";
import { useBranding } from "../useBranding";
import { studentApi } from "./studentApi";

export default function StudentLogin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { data: brand } = useBranding(studentApi);

    const handleLogin = async (username: string, password: string) => {
        if (!username || !password) { setError("Enter your username and password"); return; }
        setLoading(true);
        setError(null);
        try {
            const r = await studentApi.post("/student-login", { username, password });
            const { token, student } = r.data;
            localStorage.setItem("student_token", token);
            localStorage.setItem("student_info", JSON.stringify(student));
            toast.success(`Welcome back, ${student.name}!`);
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed. Check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PortalLogin
            portalName="Student Portal"
            brandName={brand?.name || tenantDisplayName() || undefined}
            brandCrest={brand?.logo || undefined}
            icon={PORTAL_THEME.student.icon}
            accent={PORTAL_THEME.student.accent}
            usernameLabel="Username"
            loading={loading}
            error={error}
            onSubmit={handleLogin}
            onForgot={() => toast.info("Contact your school administrator to reset your password.")}
        />
    );
}
