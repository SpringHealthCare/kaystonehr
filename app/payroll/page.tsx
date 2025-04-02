'use client'

import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { PayrollDashboard } from "@/components/payroll/payroll-dashboard"

export default function PayrollPage() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <PayrollDashboard />
        </main>
      </div>
    </div>
  )
} 