'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

interface AttendanceRecord {
  status: 'present' | 'late' | 'absent'
  date: Date
  uid: string
}

interface MonthlyStats {
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
}

export default function EmployeeDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)

  useEffect(() => {
    console.log('Auth loading:', authLoading)
    console.log('User:', user)

    const fetchAttendanceData = async () => {
      if (!user) {
        console.log('No user found, returning')
        setLoading(false)
        return
      }

      try {
        console.log('Fetching attendance data for user:', user.id)
        // Get today's attendance
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayEnd = new Date(today)
        todayEnd.setHours(23, 59, 59, 999)

        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('uid', '==', user.id),
          where('date', '>=', today),
          where('date', '<=', todayEnd)
        )

        const attendanceSnapshot = await getDocs(attendanceQuery)
        console.log('Today attendance snapshot:', attendanceSnapshot.empty ? 'empty' : 'has data')
        if (!attendanceSnapshot.empty) {
          setTodayAttendance(attendanceSnapshot.docs[0].data() as AttendanceRecord)
        }

        // Get monthly stats
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        const monthlyQuery = query(
          collection(db, 'attendance'),
          where('uid', '==', user.id),
          where('date', '>=', startOfMonth),
          where('date', '<=', endOfMonth)
        )

        const monthlySnapshot = await getDocs(monthlyQuery)
        console.log('Monthly stats snapshot:', monthlySnapshot.empty ? 'empty' : 'has data')
        const stats = {
          totalDays: monthlySnapshot.size,
          presentDays: monthlySnapshot.docs.filter(doc => doc.data().status === 'present').length,
          absentDays: monthlySnapshot.docs.filter(doc => doc.data().status === 'absent').length,
          lateDays: monthlySnapshot.docs.filter(doc => doc.data().status === 'late').length,
        } as MonthlyStats
        setMonthlyStats(stats)
      } catch (error) {
        console.error('Error fetching attendance data:', error)
      } finally {
        console.log('Setting loading to false')
        setLoading(false)
      }
    }

    fetchAttendanceData()
  }, [user, authLoading])

  if (authLoading || loading) {
    console.log('Rendering loading state')
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('No user found, redirecting to sign in')
    return null
  }

  console.log('Rendering dashboard with user:', user)
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome back, {user?.name}
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Today's Attendance Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        todayAttendance?.status === 'present' ? 'bg-green-100' :
                        todayAttendance?.status === 'late' ? 'bg-yellow-100' :
                        todayAttendance?.status === 'absent' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        <span className={`text-lg font-semibold ${
                          todayAttendance?.status === 'present' ? 'text-green-600' :
                          todayAttendance?.status === 'late' ? 'text-yellow-600' :
                          todayAttendance?.status === 'absent' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {todayAttendance?.status ? todayAttendance.status.charAt(0).toUpperCase() : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Today's Status
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {todayAttendance?.status ? todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1) : 'Not Checked In'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Stats Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <h3 className="text-lg font-medium text-gray-900">Monthly Statistics</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Present Days</p>
                      <p className="text-lg font-semibold text-green-600">{monthlyStats?.presentDays || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Late Days</p>
                      <p className="text-lg font-semibold text-yellow-600">{monthlyStats?.lateDays || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Absent Days</p>
                      <p className="text-lg font-semibold text-red-600">{monthlyStats?.absentDays || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Days</p>
                      <p className="text-lg font-semibold text-gray-900">{monthlyStats?.totalDays || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                  <div className="mt-4 space-y-4">
                    <a
                      href="/attendance"
                      className="block w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Check Attendance
                    </a>
                    <a
                      href="/leave"
                      className="block w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Request Leave
                    </a>
                    <a
                      href="/documents"
                      className="block w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      View Documents
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 