'use client'

import { useAuth } from '@/contexts/auth-context'
import { ProductivityDashboard } from '@/components/productivity/productivity-dashboard'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export default function ProductivityPage() {
  const { user } = useAuth()

  // Only allow admin and manager roles to access this page
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return <div>Access denied</div>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePath="/productivity" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-700">Productivity Analytics</h1>
                <p className="text-gray-500">Track and analyze employee productivity metrics.</p>
              </div>
            </div>

            <ProductivityDashboard />
          </div>
        </main>
      </div>
    </div>
  )
} 