'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsDashboard } from '@/components/attendance/analytics-dashboard'
import { ShiftScheduler } from '@/components/attendance/shift-schedule'
import { Users, Briefcase, BarChart3 } from 'lucide-react'

interface Department {
  id: string;
  name: string;
  employeeCount: number;
}

export function ManagerDashboard() {
  const { user } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDepartments()
  }, [user])

  const fetchDepartments = async () => {
    if (!user) return

    try {
      setLoading(true)
      const departmentsQuery = query(
        collection(db, 'departments'),
        where('managerId', '==', user.uid)
      )

      const querySnapshot = await getDocs(departmentsQuery)
      const departmentData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Department[]

      setDepartments(departmentData)
      if (departmentData.length > 0) {
        setSelectedDepartment(departmentData[0].id)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
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
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
      </div>

      {departments.length > 0 ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Department Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              Shift Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <Card key={dept.id} className="p-4">
                  <h3 className="text-lg font-medium">{dept.name}</h3>
                  <p className="text-sm text-gray-500">
                    {dept.employeeCount} Employees
                  </p>
                  <button
                    onClick={() => setSelectedDepartment(dept.id)}
                    className={`mt-2 text-sm ${
                      selectedDepartment === dept.id
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    View Details
                  </button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard viewMode="managed" />
          </TabsContent>

          <TabsContent value="shifts">
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Department Shift Schedule</h2>
                <ShiftScheduler
                  departmentId={selectedDepartment || undefined}
                  isManager={true}
                />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">No Departments Assigned</h2>
          <p className="text-gray-500">
            You currently don't have any departments assigned to manage.
          </p>
        </Card>
      )}
    </div>
  )
} 