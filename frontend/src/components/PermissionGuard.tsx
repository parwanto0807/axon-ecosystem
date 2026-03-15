"use client"

import { useSession } from "next-auth/react"
import React from "react"

interface PermissionGuardProps {
    children: React.ReactNode
    roles?: string[]
    department?: string | string[]
    fallback?: React.ReactNode
}

/**
 * PermissionGuard
 * 
 * A wrapper component to conditionally render content based on the user's role and department.
 * 
 * Example usage:
 * <PermissionGuard roles={['ADMIN', 'SUPER_ADMIN', 'MANAGER']} department="FINANCE">
 *   <button>Approve Transaction</button>
 * </PermissionGuard>
 */
export function PermissionGuard({ 
    children, 
    roles, 
    department, 
    fallback = null 
}: PermissionGuardProps) {
    const { data: session }: any = useSession()

    if (!session) return fallback as React.ReactNode

    const userRole = session.user?.role
    const userDept = session.user?.department

    // Admin and Super Admin always pass
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
        return <>{children}</>
    }

    // Check Roles if provided
    if (roles && !roles.includes(userRole)) {
        return fallback as React.ReactNode
    }

    // Check Department if provided
    if (department) {
        const allowedDepts = Array.isArray(department) ? department : [department]
        if (!allowedDepts.includes(userDept)) {
            return fallback as React.ReactNode
        }
    }

    return <>{children}</>
}
