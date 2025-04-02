'use client'

import type React from "react"
import Link from "next/link"
import { Users, Clock, FileText, BarChart3, Settings, LogOut, Wallet, User, Calendar, LineChart } from "lucide-react"
import { Logo } from "./logo"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface SidebarProps {
  activePath?: string
}

export function Sidebar({ activePath }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/auth/sign-in')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getNavigationItems = () => {
    if (!user) return []

    const items = [
      { name: "Dashboard", href: "/", icon: BarChart3 },
      { name: "Profile", href: "/profile", icon: User },
    ]

    // Admin has access to everything
    if (user.role === 'admin') {
      items.push(
        { name: "Employees", href: "/employees", icon: Users },
        { name: "Attendance", href: "/attendance", icon: Clock },
        { name: "Attendance Reports", href: "/attendance/reports", icon: BarChart3 },
        { name: "Leave Management", href: "/leave", icon: Calendar },
        { name: "Payroll", href: "/payroll", icon: Wallet },
        { name: "Productivity", href: "/productivity", icon: LineChart },
        { name: "Documents", href: "/documents", icon: FileText },
        { name: "Settings", href: "/settings", icon: Settings }
      )
    }
    // Manager has access to attendance, employees, documents, and payroll
    else if (user.role === 'manager') {
      items.push(
        { name: "Employees", href: "/employees", icon: Users },
        { name: "Attendance", href: "/attendance", icon: Clock },
        { name: "Attendance Reports", href: "/attendance/reports", icon: BarChart3 },
        { name: "Leave Management", href: "/leave", icon: Calendar },
        { name: "Payroll", href: "/payroll", icon: Wallet },
        { name: "Productivity", href: "/productivity", icon: LineChart },
        { name: "Documents", href: "/documents", icon: FileText }
      )
    }
    // Employee has access to dashboard, attendance check-in/out, and documents
    else if (user.role === 'employee') {
      items.push(
        { name: "Attendance", href: "/attendance", icon: Clock },
        { name: "Leave Management", href: "/leave", icon: Calendar },
        { name: "Documents", href: "/documents", icon: FileText }
      )
    }

    return items
  }

  return (
    <div className="w-60 min-h-screen bg-[#0f172a] text-white flex flex-col">
      <div className="p-4">
        <Logo />
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {getNavigationItems().map((item) => {
          const isActive = activePath ? activePath === item.href : pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  )
}

