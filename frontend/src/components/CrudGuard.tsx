import { ReactNode } from "react";
import { useModuleCrud } from "@/contexts/PermissionsContext";

/**
 * Renders children only when the current user has the specified CRUD permission
 * for the given module.
 *
 * Usage:
 *   <CrudGuard module="students" action="create">
 *     <button>Add Student</button>
 *   </CrudGuard>
 */
export default function CrudGuard({
    module,
    action,
    children,
    fallback = null,
}: {
    module: string;
    action: "create" | "update" | "delete" | "read";
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const crud = useModuleCrud(module);
    const allowed =
        action === "create" ? crud.canCreate :
        action === "update" ? crud.canUpdate :
        action === "delete" ? crud.canDelete :
        crud.canRead;

    return allowed ? <>{children}</> : <>{fallback}</>;
}
