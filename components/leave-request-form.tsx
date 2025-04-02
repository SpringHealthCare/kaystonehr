'use client'

import { useState, useEffect } from 'react'
import { LeaveType, LeaveRequest, LeaveBalance } from '@/types/leave'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, addDoc, doc, getDoc } from 'firebase/firestore'
import { toast } from 'react-hot-toast'
import { differenceInDays, addDays } from 'date-fns'

interface LeaveRequestFormProps {
  onClose: () => void
  onSuccess: () => void
}

export function LeaveRequestForm({ onClose, onSuccess }: LeaveRequestFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<LeaveBalance | null>(null)
  const [formData, setFormData] = useState({
    type: 'annual' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
    attachments: [] as string[]
  })
  const [daysRequested, setDaysRequested] = useState(0)

  useEffect(() => {
    fetchLeaveBalance()
  }, [user?.id])

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const days = differenceInDays(
        new Date(formData.endDate),
        new Date(formData.startDate)
      ) + 1 // Include both start and end dates
      setDaysRequested(days)
    }
  }, [formData.startDate, formData.endDate])

  const fetchLeaveBalance = async () => {
    if (!user?.id) return

    try {
      const currentYear = new Date().getFullYear()
      const balanceRef = doc(db, 'leaveBalances', `${user.id}_${currentYear}`)
      const balanceDoc = await getDoc(balanceRef)

      if (balanceDoc.exists()) {
        setBalance(balanceDoc.data() as LeaveBalance)
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !balance) return

    try {
      setLoading(true)

      // Check if there's sufficient balance
      const balanceKey = formData.type as keyof LeaveBalance
      const availableDays = balance[balanceKey] as number

      if (daysRequested > availableDays) {
        toast.error(`Insufficient ${formData.type} leave balance. Available: ${availableDays} days`)
        return
      }

      const leaveRequest: Omit<LeaveRequest, 'id'> = {
        employeeId: user.id,
        employeeName: user.name,
        department: user.department || 'Unassigned',
        type: formData.type,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        status: 'pending',
        reason: formData.reason,
        createdAt: new Date(),
        updatedAt: new Date(),
        attachments: formData.attachments
      }

      await addDoc(collection(db, 'leaveRequests'), leaveRequest)
      toast.success('Leave request submitted successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error submitting leave request:', error)
      toast.error('Failed to submit leave request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Leave Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveType })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="annual">Annual Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="personal">Personal Leave</option>
          <option value="maternity">Maternity Leave</option>
          <option value="paternity">Paternity Leave</option>
          <option value="bereavement">Bereavement Leave</option>
          <option value="unpaid">Unpaid Leave</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      {daysRequested > 0 && balance && (
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600">
            Days requested: <span className="font-medium">{daysRequested}</span>
          </p>
          <p className="text-sm text-gray-600">
            Available balance: <span className="font-medium">{String(balance[formData.type as keyof LeaveBalance])}</span> days
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Reason</label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  )
} 