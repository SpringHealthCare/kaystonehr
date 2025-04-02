'use client'

import { useState, useEffect } from 'react'
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { Plus, Search, Filter } from "lucide-react"
import { EmployeeTable } from "@/components/employee-table"
import { EmployeeForm } from "@/components/employee-form"
import { Employee, EmployeeFormData } from "@/types/employee"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore"
import { toast } from "react-hot-toast"
import { auth } from "@/lib/firebase"
import { createEmployee } from "@/lib/firebase"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const q = query(collection(db, "employees"), orderBy("firstName"))
      const querySnapshot = await getDocs(q)
      const employeeList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[]
      setEmployees(employeeList)
    } catch (error) {
      console.error("Error fetching employees:", error)
      toast.error("Failed to fetch employees")
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = async (data: EmployeeFormData) => {
    try {
      console.log('Adding employee with data:', data)
      
      // Create employee using the createEmployee function
      const user = await createEmployee({
        ...data,
        role: data.role || 'employee'
      })

      // Update local state
      const newEmployee = {
        id: user.uid,
        uid: user.uid,
        ...data,
        hasPassword: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Employee
      
      setEmployees(prev => [...prev, newEmployee])
      
      // Show success message
      toast.success("Employee added successfully")
      
      // Log success
      console.log('Employee added successfully:', newEmployee)
    } catch (error) {
      console.error("Error adding employee:", error)
      // Show more specific error message
      if (error instanceof Error) {
        toast.error(`Failed to add employee: ${error.message}`)
      } else {
        toast.error("Failed to add employee")
      }
      throw error
    }
  }

  const handleEditEmployee = async (data: EmployeeFormData) => {
    if (!selectedEmployee) return

    try {
      const employeeRef = doc(db, "employees", selectedEmployee.id)
      await updateDoc(employeeRef, {
        ...data,
        updatedAt: new Date()
      })
      setEmployees(prev => prev.map(emp => 
        emp.id === selectedEmployee.id 
          ? { ...emp, ...data }
          : emp
      ))
      toast.success("Employee updated successfully")
    } catch (error) {
      console.error("Error updating employee:", error)
      toast.error("Failed to update employee")
      throw error
    }
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteDoc(doc(db, "employees", employeeId))
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId))
      toast.success("Employee deleted successfully")
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast.error("Failed to delete employee")
    }
  }

  const handleFormSubmit = async (data: EmployeeFormData) => {
    try {
      console.log('Form submitted with data:', data)
      if (selectedEmployee) {
        await handleEditEmployee(data)
      } else {
        await handleAddEmployee(data)
      }
      setIsFormOpen(false)
      setSelectedEmployee(null)
    } catch (error) {
      console.error('Error in handleFormSubmit:', error)
      // Error is already handled in the respective functions
    }
  }

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsFormOpen(true)
  }

  const handleDelete = (employeeId: string) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      handleDeleteEmployee(employeeId)
    }
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
                <h1 className="text-2xl font-bold text-gray-700">Employee Management</h1>
                <p className="text-gray-500">Manage your organization&apos;s employees.</p>
              </div>

              <button
                onClick={() => {
                  setSelectedEmployee(null)
                  setIsFormOpen(true)
                }}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Plus size={20} className="mr-2" />
                Add Employee
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Departments</option>
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Design">Design</option>
                  <option value="Management">Management</option>
                </select>

                <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  <Filter size={20} className="mr-2" />
                  More Filters
                </button>
              </div>

              <EmployeeTable
                employees={employees}
                onEdit={handleEdit}
                onDelete={handleDelete}
                searchQuery={searchQuery}
                departmentFilter={departmentFilter}
              />
            </div>
          </div>
        </main>
      </div>

      <EmployeeForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedEmployee(null)
        }}
        onSubmit={handleFormSubmit}
        initialData={selectedEmployee || undefined}
      />
    </div>
  )
} 