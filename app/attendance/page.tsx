'use client'

import { useState, useEffect } from 'react'
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { Filter } from "lucide-react"
import { AttendanceRecord, AttendanceStats, AttendanceFilters, AttendanceSettings, AttendanceNotification } from "@/types/attendance"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy, onSnapshot } from "firebase/firestore"
import { toast } from "react-hot-toast"
import { detectIdleTime, calculateAttendanceStats, startIdleTimeTracking } from "@/lib/attendance"
import { AttendanceDetails } from "@/components/attendance-details"
import { AttendanceCheckIn } from '@/components/attendance-check-in'
import { AttendanceTableMobile } from '@/components/attendance-table-mobile'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AttendanceFilterPanel } from "@/components/attendance-filter-panel"
import { AttendanceTable } from '@/components/attendance-table'
import { Calendar } from "@/components/ui/calendar"
import { AttendanceCheckOut } from '@/components/attendance-check-out'
import { Clock, MapPin, User } from 'lucide-react'
import { TeamAttendanceOverview } from '@/components/team-attendance-overview'

const DEFAULT_SETTINGS: AttendanceSettings = {
  workingHours: {
    start: "09:00",
    end: "17:00"
  },
  idleThreshold: 15, // minutes
  maxIdlePeriods: 3,
  allowedLateMinutes: 15,
  locationRadius: 100, // meters
  requiredCheckInDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  requireManagerApproval: true,
  autoApproveThreshold: 30 // minutes
}

export default function AttendancePage() {
  const { user } = useAuth()
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
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
      approved: 0,
      rejected: 0,
      pending: 0
    },
    averageHours: 0,
    overtimeHours: 0,
    pendingApprovals: 0
  })
  const [filters, setFilters] = useState<AttendanceFilters>({})
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])
  const [isIdle, setIsIdle] = useState(false)
  const [idlePeriods, setIdlePeriods] = useState<{ startTime: Date; endTime: Date }[]>([])

  useEffect(() => {
    fetchTodayRecord()
    fetchAttendanceRecords()
    getCurrentLocation()
    fetchDepartments()
  }, [filters])

  useEffect(() => {
    if (!user) return

    let q = query(
      collection(db, "attendance"),
      orderBy("date", "desc")
    )

    if (user.role !== 'admin') {
      q = query(q, where("employeeId", "==", user.uid))
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordsList = snapshot.docs.map(doc => {
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
      setAttendanceRecords(recordsList)
      setStats(calculateAttendanceStats(recordsList))
      setLoading(false)
    }, (error) => {
      console.error("Error fetching attendance records:", error)
      toast.error("Failed to fetch attendance records")
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user || !todayRecord || todayRecord.checkOut) return

    // Start idle time tracking
    const cleanup = startIdleTimeTracking(
      (startTime) => {
        setIsIdle(true)
        setIdlePeriods(prev => [...prev, { startTime, endTime: new Date() }])
      },
      (startTime, endTime) => {
        setIsIdle(false)
        setIdlePeriods(prev => 
          prev.map(period => 
            period.startTime === startTime 
              ? { ...period, endTime } 
              : period
          )
        )
      },
      DEFAULT_SETTINGS
    )

    return cleanup
  }, [user, todayRecord])

  // Update attendance record with idle time
  useEffect(() => {
    if (!todayRecord || !idlePeriods.length) return

    const updateRecord = async () => {
      try {
        const recordRef = doc(db, 'attendance', todayRecord.id)
        const updatedRecord = detectIdleTime({
          ...todayRecord,
          idleTime: idlePeriods.map(period => ({
            startTime: period.startTime,
            endTime: period.endTime,
            duration: (period.endTime.getTime() - period.startTime.getTime()) / (1000 * 60) // in minutes
          }))
        }, DEFAULT_SETTINGS)

        await updateDoc(recordRef, {
          idleTime: updatedRecord.idleTime,
          flags: updatedRecord.flags,
          status: updatedRecord.status,
          updatedAt: new Date()
        })
      } catch (error) {
        console.error('Error updating idle time:', error)
        toast.error('Failed to update idle time')
      }
    }

    updateRecord()
  }, [todayRecord, idlePeriods])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          toast.error('Failed to get location')
        }
      )
    }
  }

  const getDeviceInfo = () => {
    return {
      browser: navigator.userAgent,
      os: navigator.platform,
      ip: '' // Would need a backend service to get IP
    }
  }

  const fetchTodayRecord = async () => {
    if (!user) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('employeeId', '==', user.uid),
        where('date', '>=', today)
      )
      const attendanceSnapshot = await getDocs(attendanceQuery)

      if (!attendanceSnapshot.empty) {
        setTodayRecord({
          id: attendanceSnapshot.docs[0].id,
          ...attendanceSnapshot.docs[0].data()
        })
      }
    } catch (error) {
      console.error('Error fetching today\'s record:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceRecords = async () => {
    try {
      let q = query(collection(db, 'attendance'))
      
      if (user?.role === 'employee') {
        q = query(q, where('employeeId', '==', user.uid))
      } else if (user?.role === 'manager') {
        q = query(q, where('managerId', '==', user.uid))
      }
      
      if (filters.startDate) {
        q = query(q, where('date', '>=', Timestamp.fromDate(filters.startDate)))
      }
      
      if (filters.endDate) {
        q = query(q, where('date', '<=', Timestamp.fromDate(filters.endDate)))
      }

      const querySnapshot = await getDocs(q)
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        checkIn: {
          ...doc.data().checkIn,
          time: doc.data().checkIn.time.toDate()
        },
        checkOut: doc.data().checkOut ? {
          ...doc.data().checkOut,
          time: doc.data().checkOut.time.toDate()
        } : undefined
      })) as AttendanceRecord[]

      setAttendanceRecords(records)
      setStats(calculateAttendanceStats(records))
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      toast.error('Failed to fetch attendance records')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      // ... existing fetch logic ...
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleApprove = async (recordId: string, notes?: string) => {
    try {
      const recordRef = doc(db, "attendance", recordId)
      await updateDoc(recordRef, {
        approvalStatus: 'approved',
        approvedBy: user?.id,
        approvedAt: new Date(),
        ...(notes && { approvalNotes: notes })
      })
      toast.success("Attendance record approved")
    } catch (error) {
      console.error("Error approving attendance record:", error)
      toast.error("Failed to approve attendance record")
    }
  }

  const handleReject = async (recordId: string, notes?: string) => {
    try {
      const recordRef = doc(db, "attendance", recordId)
      await updateDoc(recordRef, {
        approvalStatus: 'rejected',
        approvedBy: user?.id,
        approvedAt: new Date(),
        ...(notes && { approvalNotes: notes })
      })
      toast.success("Attendance record rejected")
    } catch (error) {
      console.error("Error rejecting attendance record:", error)
      toast.error("Failed to reject attendance record")
    }
  }

  const handleDateSelect = (day: Date | undefined) => {
    setSelectedDate(day || null)
  }

  const handleApplyFilters = (newFilters: AttendanceFilters) => {
    setFilters(newFilters)
    setShowFilterPanel(false)
  }

  const handleClearFilters = () => {
    setFilters({})
    setShowFilterPanel(false)
  }

  const handleSuccess = () => {
    fetchTodayRecord()
    fetchAttendanceRecords()
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
                <h1 className="text-2xl font-bold text-gray-700">Attendance</h1>
                <p className="text-gray-500">
                  {user?.role === 'employee' 
                    ? 'Track your daily attendance and view your history.'
                    : 'Track employee attendance and view reports.'}
                </p>
              </div>
              <div className="flex gap-4">
                <AttendanceCheckIn onSuccess={handleSuccess} />
                <AttendanceCheckOut onSuccess={handleSuccess} />
                <Button
                  onClick={() => setShowFilterPanel(true)}
                  variant="outline"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Team Overview for Managers */}
            {user?.role === 'manager' && (
              <div className="mb-8">
                <TeamAttendanceOverview />
              </div>
            )}

            {/* Today's Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Today's Status</h2>
              {todayRecord ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user?.name || 'Unknown User'}</p>
                      <p className="text-sm text-gray-500">{user?.department || 'No Department'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Check-in</p>
                        <p className="text-sm font-medium">
                          {new Date(todayRecord.checkIn.time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {todayRecord.checkOut ? (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Check-out</p>
                          <p className="text-sm font-medium">
                            {new Date(todayRecord.checkOut.time).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Activity Status</p>
                          <p className={`text-sm font-medium ${isIdle ? 'text-red-600' : 'text-green-600'}`}>
                            {isIdle ? 'Idle' : 'Active'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {todayRecord.checkIn.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="text-sm font-medium">
                          {todayRecord.checkIn.location.address || 'Office Location'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Idle Time Summary */}
                  {idlePeriods.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Idle Time Summary</h3>
                      <div className="space-y-2">
                        {idlePeriods.map((period, index) => {
                          const duration = (period.endTime.getTime() - period.startTime.getTime()) / (1000 * 60)
                          return (
                            <div key={index} className="text-sm text-gray-600">
                              {new Date(period.startTime).toLocaleTimeString()} - 
                              {new Date(period.endTime).toLocaleTimeString()} 
                              ({Math.round(duration)} minutes)
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No attendance record for today</p>
              )}
            </div>

            {/* Calendar and Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Calendar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate || undefined}
                      onSelect={handleDateSelect}
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDate ? (
                      <AttendanceDetails
                        date={selectedDate}
                        records={attendanceRecords}
                        onApprove={user?.role !== 'employee' ? handleApprove : undefined}
                        onReject={user?.role !== 'employee' ? handleReject : undefined}
                      />
                    ) : (
                      <p className="text-gray-500">Select a date to view details</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Records Table */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="hidden md:block">
                    {selectedDate ? (
                      <AttendanceTable date={selectedDate} />
                    ) : (
                      <p className="text-gray-500">Select a date to view records</p>
                    )}
                  </div>
                  <div className="md:hidden">
                    <AttendanceTableMobile
                      records={attendanceRecords}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Panel */}
            <AttendanceFilterPanel
              isOpen={showFilterPanel}
              onClose={() => setShowFilterPanel(false)}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
              departments={departments}
              currentFilters={filters}
            />
          </div>
        </main>
      </div>
    </div>
  )
} 