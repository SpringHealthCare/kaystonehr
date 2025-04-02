'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, getDocs } from 'firebase/firestore'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { AnalyticsDashboard } from '@/components/attendance/analytics-dashboard'
import { ShiftScheduler } from '@/components/attendance/shift-schedule'
import { Users, Building2, BarChart3, Settings } from 'lucide-react'

interface Department {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  employeeCount: number;
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [organizationStats, setOrganizationStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    activeShifts: 0
  })

  useEffect(() => {
    fetchOrganizationData()
  }, [user])

  const fetchOrganizationData = async () => {
    if (!user) return

    try {
      setLoading(true)
      // Fetch departments
      const departmentsSnapshot = await getDocs(collection(db, 'departments'))
      const departmentData = departmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Department[]
      setDepartments(departmentData)

      // Calculate organization stats
      const employeesSnapshot = await getDocs(collection(db, 'users'))
      const shiftsSnapshot = await getDocs(collection(db, 'shifts'))

      setOrganizationStats({
        totalEmployees: employeesSnapshot.size,
        totalDepartments: departmentData.length,
        activeShifts: shiftsSnapshot.docs.filter(doc => doc.data().isActive).length
      })
    } catch (error) {
      console.error('Error fetching organization data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Select
          value={selectedDepartment}
          onValueChange={(value) => setSelectedDepartment(value)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Employees</h3>
          <p className="text-2xl font-bold">{organizationStats.totalEmployees}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Departments</h3>
          <p className="text-2xl font-bold">{organizationStats.totalDepartments}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Active Shifts</h3>
          <p className="text-2xl font-bold">{organizationStats.activeShifts}</p>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics" className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Shift Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsDashboard viewMode="all" />
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dept) => (
              <Card key={dept.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium">{dept.name}</h3>
                    <p className="text-sm text-gray-500">
                      Manager: {dept.managerName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {dept.employeeCount} Employees
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDepartment(dept.id)}
                    className={`text-sm ${
                      selectedDepartment === dept.id
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    View Details
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shifts">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Organization Shift Schedule</h2>
              <ShiftScheduler
                departmentId={selectedDepartment === 'all' ? undefined : selectedDepartment}
                isManager={true}
              />
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 