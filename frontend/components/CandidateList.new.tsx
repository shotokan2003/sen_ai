'use client'

import { useState } from 'react'
import { m as motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resumeApi, type Candidate } from '@/src/lib/api'
import toast from 'react-hot-toast'
import { EyeIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface ResumeModalProps {
  isOpen: boolean
  onClose: () => void
  resumeUrl: string
  filename: string
}

const ResumeModal = ({ isOpen, onClose, resumeUrl, filename }: ResumeModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl"
            >
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium">Resume Preview: {filename}</h3>
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  &times;
                </button>
              </div>

              <div className="relative w-full" style={{ height: '80vh' }}>
                <iframe
                  src={resumeUrl}
                  className="absolute inset-0 w-full h-full"
                  title="Resume Preview"
                />
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end">
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Open in New Tab
                </a>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function CandidateList() {
  const [selectedStatus, setSelectedStatus] = useState('')
  const [resumeModal, setResumeModal] = useState<{
    isOpen: boolean
    url: string
    filename: string
  }>({
    isOpen: false,
    url: '',
    filename: '',
  })

  const queryClient = useQueryClient()

  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ['candidates', selectedStatus],
    queryFn: () => resumeApi.getCandidates(100, selectedStatus || undefined)
  })

  const shortlist = useMutation({
    mutationFn: (candidateId: number) => resumeApi.shortlistCandidate(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      toast.success('Candidate shortlisted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to shortlist candidate')
    }
  })

  const handleViewResume = async (candidateId: number) => {
    try {
      const data = await resumeApi.viewResume(candidateId)
      setResumeModal({
        isOpen: true,
        url: data.resume_url,
        filename: data.filename
      })
    } catch (error) {
      console.error('Error viewing resume:', error)
      toast.error('Failed to load resume')
    }
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-4">
        Error loading candidates: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  const statusBadgeColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    shortlisted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  }

  return (
    <div>
      {/* Status Filter */}
      <div className="mb-4">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Candidates Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Years Exp
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Skills
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </td>
              </tr>
            ) : candidates && candidates.length > 0 ? (
              candidates.map((candidate: Candidate) => (
                <tr key={candidate.candidate_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {candidate.candidate_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {candidate.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {candidate.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {candidate.years_experience || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.map((skill, idx) => (
                        <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeColors[candidate.status]}`}>
                      {candidate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {/* Shortlist Button */}
                    <button
                      onClick={() => shortlist.mutate(candidate.candidate_id)}
                      disabled={candidate.status === 'shortlisted' || shortlist.isPending}
                      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                        candidate.status === 'shortlisted'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {shortlist.isPending ? (
                        <ChevronUpIcon className="animate-bounce h-4 w-4" />
                      ) : (
                        'Shortlist'
                      )}
                    </button>

                    {/* View Resume Button */}
                    {candidate.resume_available && (
                      <button
                        onClick={() => handleViewResume(candidate.candidate_id)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No candidates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Resume Preview Modal */}
      <ResumeModal
        isOpen={resumeModal.isOpen}
        onClose={() => setResumeModal(prev => ({ ...prev, isOpen: false }))}
        resumeUrl={resumeModal.url}
        filename={resumeModal.filename}
      />
    </div>
  )
}
