'use client'

import { useState } from 'react'
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { LeaveRequestForm } from "@/components/leave-request-form"
import { LeaveRequestsList } from "@/components/leave-requests-list"
import { LeaveBalanceDisplay } from "@/components/leave-balance"
import { useAuth } from "@/contexts/auth-context"
import { Plus, Calendar, Clock, CheckCircle, XCircle } from "lucide-react"

export default function LeavePage() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState<'all' | 'pending' | 'my'>('all')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-700">Leave Management</h1>
                <p className="text-gray-500">Manage leave requests and approvals</p>
              </div>

              {user?.role === 'employee' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  <Plus size={20} className="mr-2" />
                  Request Leave
                </button>
              )}
            </div>

            {/* Leave Balance */}
            <div className="mb-6">
              <LeaveBalanceDisplay />
            </div>

            {/* View Tabs */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setView('all')}
                className={`flex items-center px-4 py-2 rounded-md ${
                  view === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar size={20} className="mr-2" />
                All Requests
              </button>
              <button
                onClick={() => setView('pending')}
                className={`flex items-center px-4 py-2 rounded-md ${
                  view === 'pending'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Clock size={20} className="mr-2" />
                Pending
              </button>
              <button
                onClick={() => setView('my')}
                className={`flex items-center px-4 py-2 rounded-md ${
                  view === 'my'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CheckCircle size={20} className="mr-2" />
                My Requests
              </button>
            </div>

            {/* Leave Requests List */}
            <LeaveRequestsList view={view} />
          </div>
        </main>
      </div>

      {/* Leave Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Submit Leave Request</h2>
            <LeaveRequestForm
              onClose={() => setShowForm(false)}
              onSuccess={() => {
                setView('my')
                setShowForm(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
} 