'use client'

import { useState, useEffect } from 'react'
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { AttendanceReport } from "@/components/attendance-report"
import { AttendanceFilterPanel } from "@/components/attendance-filter-panel"
import { AttendanceRecord, AttendanceStats, AttendanceFilters } from "@/types/attendance"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Download, Filter } from "lucide-react"
import { exportAttendanceToCSV } from "@/lib/export-attendance"
import { AttendanceAnalytics } from "@/components/attendance-analytics"

export default function AttendanceReportsPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    earlyLeaveDays: 0,
    halfDays: 0,
    attendanceRate: 0,
    averageIdleTime: 0,
    flags: {
      count: 0,
      byType: {
        irregular_hours: 0,
        multiple_idle_periods: 0,
        location_mismatch: 0,
        device_change: 0
      }
    },
    approvalStats: {
      pending: 0,
      approved: 0,
      rejected: 0
    },
    averageHours: 0,
    overtimeHours: 0,
    pendingApprovals: 0
  })
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [loading, setLoading] = useState(true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [filters, setFilters] = useState<AttendanceFilters>({})
  const [departments, setDepartments] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date()
  })

  useEffect(() => {
    fetchAttendanceRecords()
    fetchDepartments()
  }, [period, dateRange, filters])

  const fetchDepartments = async () => {
    try {
      const q = query(collection(db, "employees"))
      const querySnapshot = await getDocs(q)
      const depts = new Set<string>()
      querySnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.department) {
          depts.add(data.department)
        }
      })
      setDepartments(Array.from(depts))
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true)
      let q = query(
        collection(db, "attendance"),
        where("date", ">=", dateRange.start),
        where("date", "<=", dateRange.end),
        orderBy("date", "desc")
      )

      // Apply filters
      if (filters.department) {
        q = query(q, where("department", "==", filters.department))
      }
      if (filters.status) {
        q = query(q, where("status", "==", filters.status))
      }
      if (filters.approvalStatus) {
        q = query(q, where("approvalStatus", "==", filters.approvalStatus))
      }

      // If user is not admin, only fetch their own records
      if (user?.role !== 'admin' && user?.uid) {
        q = query(q, where("employeeId", "==", user.uid))
      }

      const querySnapshot = await getDocs(q)
      const recordsList = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          checkIn: {
            ...data.checkIn,
            time: data.checkIn?.time?.toDate() || new Date(),
            location: data.checkIn?.location || null,
            deviceInfo: data.checkIn?.deviceInfo || null
          },
          checkOut: data.checkOut ? {
            ...data.checkOut,
            time: data.checkOut.time?.toDate() || new Date(),
            location: data.checkOut.location || null,
            deviceInfo: data.checkOut.deviceInfo || null
          } : undefined
        }
      }) as AttendanceRecord[]

      // Apply search filter if present
      const filteredRecords = filters.search
        ? recordsList.filter(record =>
            record.employeeName.toLowerCase().includes(filters.search!.toLowerCase())
          )
        : recordsList

      setRecords(filteredRecords)
      calculateStats(filteredRecords)
    } catch (error) {
      console.error("Error fetching attendance records:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (records: AttendanceRecord[]) => {
    const totalDays = records.length
    const presentDays = records.filter(r => r.status === 'present').length
    const lateDays = records.filter(r => r.status === 'late').length
    const absentDays = records.filter(r => r.status === 'absent').length
    const pendingApprovals = records.filter(r => r.approvalStatus === 'pending').length

    // Calculate average hours
    const totalHours = records.reduce((acc, record) => {
      if (record.checkOut) {
        const hours = (new Date(record.checkOut.time).getTime() - new Date(record.checkIn.time).getTime()) / (1000 * 60 * 60)
        return acc + hours
      }
      return acc
    }, 0)

    const averageHours = totalHours / presentDays || 0

    // Calculate overtime hours (assuming 8 hours is standard)
    const overtimeHours = records.reduce((acc, record) => {
      if (record.checkOut) {
        const hours = (new Date(record.checkOut.time).getTime() - new Date(record.checkIn.time).getTime()) / (1000 * 60 * 60)
        return acc + Math.max(0, hours - 8)
      }
      return acc
    }, 0)

    const attendanceRate = totalDays ? Math.round((presentDays / totalDays) * 100) : 0

    setStats({
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      earlyLeaveDays: records.filter(record => record.status === 'early_leave').length,
      halfDays: records.filter(record => record.status === 'half_day').length,
      attendanceRate,
      averageIdleTime: records.reduce((total, record) => {
        return total + (record.idleTime?.reduce((sum, idle) => sum + idle.duration, 0) || 0)
      }, 0) / records.length || 0,
      flags: {
        count: records.reduce((total, record) => total + (record.flags?.length || 0), 0),
        byType: {
          irregular_hours: records.filter(record => record.flags?.some(flag => flag.type === 'irregular_hours')).length,
          multiple_idle_periods: records.filter(record => record.flags?.some(flag => flag.type === 'multiple_idle_periods')).length,
          location_mismatch: records.filter(record => record.flags?.some(flag => flag.type === 'location_mismatch')).length,
          device_change: records.filter(record => record.flags?.some(flag => flag.type === 'device_change')).length
        }
      },
      approvalStats: {
        pending: records.filter(record => record.approvalStatus === 'pending').length,
        approved: records.filter(record => record.approvalStatus === 'approved').length,
        rejected: records.filter(record => record.approvalStatus === 'rejected').length
      },
      averageHours,
      overtimeHours,
      pendingApprovals
    })
  }

  const handleApprove = async (recordId: string) => {
    try {
      const recordRef = doc(db, "attendance", recordId)
      await updateDoc(recordRef, {
        approvalStatus: 'approved',
        approvedBy: user?.uid,
        approvedAt: new Date()
      })
      
      // Update local state
      setRecords(prev => prev.map(record => 
        record.id === recordId 
          ? { ...record, approvalStatus: 'approved', approvedBy: user?.uid, approvedAt: new Date() }
          : record
      ))
      
      // Recalculate stats
      calculateStats(records)
    } catch (error) {
      console.error("Error approving attendance record:", error)
    }
  }

  const handleReject = async (recordId: string) => {
    try {
      const recordRef = doc(db, "attendance", recordId)
      await updateDoc(recordRef, {
        approvalStatus: 'rejected',
        rejectedBy: user?.uid,
        rejectedAt: new Date()
      })
      
      // Update local state
      setRecords(prev => prev.map(record => 
        record.id === recordId 
          ? { ...record, approvalStatus: 'rejected', rejectedBy: user?.uid, rejectedAt: new Date() }
          : record
      ))
      
      // Recalculate stats
      calculateStats(records)
    } catch (error) {
      console.error("Error rejecting attendance record:", error)
    }
  }

  const handleExport = () => {
    const filename = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`
    exportAttendanceToCSV(records, filename)
  }

  if (loading) {
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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-700">Attendance Reports</h1>
                <p className="text-gray-500">View and analyze attendance records</p>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowFilterPanel(true)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Filter size={20} className="mr-2" />
                  Filter
                </button>

                <button
                  onClick={handleExport}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  <Download size={20} className="mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Analytics Section */}
            <div className="mb-8">
              <AttendanceAnalytics records={records} period={period} />
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <AttendanceReport
                records={records}
                stats={stats}
                onApprove={user?.role !== 'employee' ? handleApprove : undefined}
                onReject={user?.role !== 'employee' ? handleReject : undefined}
              />
            </div>
          </div>
        </main>
      </div>

      <AttendanceFilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        onApply={setFilters}
        onClear={() => setFilters({})}
        departments={departments}
        currentFilters={filters}
      />
    </div>
  )
} 