'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Header } from "@/components/header"
import { QuickActionCard } from "@/components/quick-action-card"
import { Sidebar } from "@/components/sidebar"
import { Lightbulb, Calendar, HelpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Clock, DollarSign, TrendingUp } from "lucide-react"
import { collection, query, where, orderBy, limit, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import { Task } from '@/types/task'
import { Event } from '@/types/event'
import { TaskList } from '@/components/task-list'
import { EventList } from '@/components/event-list'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/sign-in')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Fetch tasks
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', user?.id),
        orderBy('dueDate', 'asc')
      )
      const tasksSnapshot = await getDocs(tasksQuery)
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[]
      setTasks(tasksData)

      // Fetch events
      const eventsQuery = query(
        collection(db, 'events'),
        where('attendees', 'array-contains', user?.id),
        orderBy('startTime', 'asc')
      )
      const eventsSnapshot = await getDocs(eventsQuery)
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[]
      setEvents(eventsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskAction = async (taskId: string, action: 'accept' | 'complete') => {
    try {
      const taskRef = doc(db, "tasks", taskId)
      const newStatus = action === 'accept' ? 'in_progress' : 'completed'
      
      await updateDoc(taskRef, {
        status: newStatus
      })

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))

      toast.success(`Task ${action === 'accept' ? 'accepted' : 'completed'} successfully`)
    } catch (error) {
      console.error("Error updating task:", error)
      toast.error("Failed to update task")
    }
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tasks Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-700">Tasks</h2>
                  <button
                    onClick={() => router.push('/tasks')}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    View All
                  </button>
                </div>
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : (
                  <TaskList tasks={tasks} />
                )}
              </div>

              {/* Events Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-700">Events</h2>
                  <button
                    onClick={() => router.push('/events')}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    View All
                  </button>
                </div>
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : (
                  <EventList events={events} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{selectedTask.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedTask.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Due: {new Date(selectedTask.dueDate instanceof Timestamp ? selectedTask.dueDate.toDate() : selectedTask.dueDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedTask.status === 'pending' && (
                  <Button 
                    onClick={() => handleTaskAction(selectedTask.id, 'accept')}
                    className="w-full"
                  >
                    Accept Task
                  </Button>
                )}
                {selectedTask.status === 'in_progress' && (
                  <Button 
                    onClick={() => handleTaskAction(selectedTask.id, 'complete')}
                    className="w-full"
                    variant="default"
                  >
                    Mark as Completed
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


