import { useAuth } from '../context/AuthContext';

interface PermissionGuardProps {
    permission: string;
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
    const { checkPermission, agent } = useAuth();

    // If not logged in, clearly not allowed (though usually handled by route protection)
    if (!agent) return <>{fallback}</>;

    if (checkPermission(permission)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
