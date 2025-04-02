'use client'

import { useState, useEffect } from 'react'
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { toast } from "react-hot-toast"
import { AttendanceSettings, SystemSettings } from "@/types/settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  workingHours: {
    start: "09:00",
    end: "17:00"
  },
  idleThreshold: 15,
  maxIdlePeriods: 3,
  allowedLateMinutes: 15,
  locationRadius: 100,
  requiredCheckInDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  requireManagerApproval: true,
  autoApproveThreshold: 30
}

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  companyName: "",
  timezone: "UTC",
  dateFormat: "MM/DD/YYYY",
  language: "en",
  emailNotifications: true,
  smsNotifications: false
}

function flattenObject(obj: any, prefix = ''): { [key: string]: any } {
  return Object.keys(obj).reduce((acc: { [key: string]: any }, k: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("attendance")
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      // Fetch attendance settings
      const attendanceSettingsRef = doc(db, 'attendance_settings', 'default')
      const attendanceSettingsDoc = await getDoc(attendanceSettingsRef)
      
      if (attendanceSettingsDoc.exists()) {
        setAttendanceSettings(attendanceSettingsDoc.data() as AttendanceSettings)
      } else {
        await setDoc(attendanceSettingsRef, DEFAULT_ATTENDANCE_SETTINGS)
        setAttendanceSettings(DEFAULT_ATTENDANCE_SETTINGS)
      }

      // Fetch system settings
      const systemSettingsRef = doc(db, 'system_settings', 'default')
      const systemSettingsDoc = await getDoc(systemSettingsRef)
      
      if (systemSettingsDoc.exists()) {
        setSystemSettings(systemSettingsDoc.data() as SystemSettings)
      } else {
        await setDoc(systemSettingsRef, DEFAULT_SYSTEM_SETTINGS)
        setSystemSettings(DEFAULT_SYSTEM_SETTINGS)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Save attendance settings
      const attendanceSettingsRef = doc(db, 'attendance_settings', 'default')
      const flattenedAttendanceSettings = flattenObject(attendanceSettings)
      await updateDoc(attendanceSettingsRef, flattenedAttendanceSettings)

      // Save system settings
      const systemSettingsRef = doc(db, 'system_settings', 'default')
      const flattenedSystemSettings = flattenObject(systemSettings)
      await updateDoc(systemSettingsRef, flattenedSystemSettings)

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleWorkingHoursChange = (type: 'start' | 'end', value: string) => {
    setAttendanceSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [type]: value
      }
    }))
  }

  const handleCheckInDaysChange = (day: string) => {
    setAttendanceSettings(prev => ({
      ...prev,
      requiredCheckInDays: prev.requiredCheckInDays.includes(day)
        ? prev.requiredCheckInDays.filter(d => d !== day)
        : [...prev.requiredCheckInDays, day]
    }))
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
                <h1 className="text-2xl font-bold text-gray-700">Settings</h1>
                <p className="text-gray-500">Configure your organization&apos;s settings and policies.</p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance" className="space-y-6">
                {/* Working Hours */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={attendanceSettings.workingHours.start}
                        onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={attendanceSettings.workingHours.end}
                        onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Idle Time Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Idle Time Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Idle Threshold (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={attendanceSettings.idleThreshold}
                        onChange={(e) => setAttendanceSettings(prev => ({
                          ...prev,
                          idleThreshold: parseInt(e.target.value)
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Idle Periods
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={attendanceSettings.maxIdlePeriods}
                        onChange={(e) => setAttendanceSettings(prev => ({
                          ...prev,
                          maxIdlePeriods: parseInt(e.target.value)
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Late Arrival Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Late Arrival Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed Late Minutes
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={attendanceSettings.allowedLateMinutes}
                        onChange={(e) => setAttendanceSettings(prev => ({
                          ...prev,
                          allowedLateMinutes: parseInt(e.target.value)
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Auto-approve Threshold (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={attendanceSettings.autoApproveThreshold}
                        onChange={(e) => setAttendanceSettings(prev => ({
                          ...prev,
                          autoApproveThreshold: parseInt(e.target.value)
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Settings</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location Radius (meters)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={attendanceSettings.locationRadius}
                      onChange={(e) => setAttendanceSettings(prev => ({
                        ...prev,
                        locationRadius: parseInt(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Required Check-in Days */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Check-in Days</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <label key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={attendanceSettings.requiredCheckInDays.includes(day)}
                          onChange={() => handleCheckInDaysChange(day)}
                          className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Approval Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Settings</h2>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={attendanceSettings.requireManagerApproval}
                        onChange={(e) => setAttendanceSettings(prev => ({
                          ...prev,
                          requireManagerApproval: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Require manager approval for attendance</span>
                    </label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="system" className="space-y-6">
                {/* Company Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={systemSettings.companyName}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          companyName: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={systemSettings.timezone}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          timezone: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="EST">Eastern Time</option>
                        <option value="CST">Central Time</option>
                        <option value="MST">Mountain Time</option>
                        <option value="PST">Pacific Time</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Format
                      </label>
                      <select
                        value={systemSettings.dateFormat}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          dateFormat: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={systemSettings.language}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          language: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                {/* Notification Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h2>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={systemSettings.emailNotifications}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          emailNotifications: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Enable email notifications</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={systemSettings.smsNotifications}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          smsNotifications: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Enable SMS notifications</span>
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
} 