'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  FolderIcon, 
  DocumentIcon, 
  XMarkIcon, 
  StarIcon,
  BriefcaseIcon,
  ChartBarIcon,
  TrophyIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resumeApi, type ShortlistingResult } from '@/src/lib/api'

interface FileWithPreview extends File {
  preview?: string
}

const MotionDiv = motion.div

export default function CandidateShortlisting() {
  const [jobDescription, setJobDescription] = useState('')
  const [file, setFile] = useState<FileWithPreview | null>(null)
  const [minScore, setMinScore] = useState(70)
  const [limit, setLimit] = useState<number | undefined>(10)
  const [inputMethod, setInputMethod] = useState<'text' | 'file'>('text')
  const [result, setResult] = useState<ShortlistingResult | null>(null)
  const [showAllCandidates, setShowAllCandidates] = useState(false)
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

  // Fetch all candidates for unified view
  const { data: allCandidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => resumeApi.getCandidates(1000),
    enabled: showAllCandidates
  })

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: ({ candidateId, status }: { candidateId: number, status: string }) => 
      resumeApi.updateCandidateStatus(candidateId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      toast.success('Candidate status updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update candidate status')
    }
  })

  // View resume handler
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

  const shortlistByText = useMutation({
    mutationFn: async () => {
      if (!jobDescription.trim()) {
        throw new Error('Please enter a job description')
      }
      return resumeApi.shortlistByDescription(jobDescription, minScore, limit)
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success(`Found ${data.shortlisted_candidates.length} matching candidates!`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to shortlist candidates')
    }
  })

  const shortlistByFile = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Please upload a job description file')
      }
      return resumeApi.shortlistByFile(file, minScore, limit)
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success(`Found ${data.shortlisted_candidates.length} matching candidates!`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to shortlist candidates')
    }
  })

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size should not exceed 10MB')
      return
    }
    setFile(selectedFile)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  })

  const handleShortlist = () => {
    if (inputMethod === 'text') {
      shortlistByText.mutate()
    } else {
      shortlistByFile.mutate()
    }
  }

  const clearAll = () => {
    setJobDescription('')
    setFile(null)
    setResult(null)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-github-success-fg dark:text-github-success-fg-dark bg-github-success-subtle dark:bg-github-success-subtle-dark'
    if (score >= 80) return 'text-github-accent-fg dark:text-github-accent-fg-dark bg-github-accent-subtle dark:bg-github-accent-subtle-dark'
    if (score >= 70) return 'text-github-attention-fg dark:text-github-attention-fg-dark bg-github-attention-subtle dark:bg-github-attention-subtle-dark'
    return 'text-github-danger-fg dark:text-github-danger-fg-dark bg-github-danger-subtle dark:bg-github-danger-subtle-dark'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <TrophyIcon className="w-5 h-5" />
    if (score >= 80) return <StarIcon className="w-5 h-5" />
    return <ChartBarIcon className="w-5 h-5" />
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex space-x-4 border-b border-github-border-default dark:border-github-border-default-dark">
        <button
          onClick={() => setShowAllCandidates(false)}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            !showAllCandidates
              ? 'border-github-accent-fg dark:border-github-accent-fg-dark text-github-accent-fg dark:text-github-accent-fg-dark'
              : 'border-transparent text-github-fg-muted dark:text-github-fg-muted-dark hover:text-github-fg-default dark:hover:text-github-fg-default-dark'
          }`}
        >
          Shortlist by Job Description
        </button>
        <button
          onClick={() => setShowAllCandidates(true)}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            showAllCandidates
              ? 'border-github-accent-fg dark:border-github-accent-fg-dark text-github-accent-fg dark:text-github-accent-fg-dark'
              : 'border-transparent text-github-fg-muted dark:text-github-fg-muted-dark hover:text-github-fg-default dark:hover:text-github-fg-default-dark'
          }`}
        >
          Manage All Candidates
        </button>
      </div>

      {!showAllCandidates ? (
        /* Original shortlisting interface */
        <>
          {/* Input Method Toggle */}
          <div className="flex space-x-4 border-b border-github-border-default dark:border-github-border-default-dark">
            <button
              onClick={() => setInputMethod('text')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                inputMethod === 'text'
                  ? 'border-github-accent-fg dark:border-github-accent-fg-dark text-github-accent-fg dark:text-github-accent-fg-dark'
                  : 'border-transparent text-github-fg-muted dark:text-github-fg-muted-dark hover:text-github-fg-default dark:hover:text-github-fg-default-dark'
              }`}
            >
              Write Job Description
            </button>
            <button
              onClick={() => setInputMethod('file')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                inputMethod === 'file'
                  ? 'border-github-accent-fg dark:border-github-accent-fg-dark text-github-accent-fg dark:text-github-accent-fg-dark'
                  : 'border-transparent text-github-fg-muted dark:text-github-fg-muted-dark hover:text-github-fg-default dark:hover:text-github-fg-default-dark'
              }`}
            >
              Upload Job Description
            </button>
          </div>

          {/* Job Description Input */}
          {inputMethod === 'text' ? (
            <div>
              <label htmlFor="jobDescription" className="block text-sm font-medium text-github-fg-default dark:text-github-fg-default-dark mb-2">
                Job Description
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Enter the job description, required skills, qualifications, and experience requirements..."
                className="github-input w-full h-48"
              />
            </div>
          ) : (
            <div 
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-github-accent-fg dark:border-github-accent-fg-dark bg-github-canvas-subtle dark:bg-github-canvas-subtle-dark' 
                  : 'border-github-border-default dark:border-github-border-default-dark hover:border-github-accent-fg dark:hover:border-github-accent-fg-dark'
                }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center space-y-4">
                {file ? (
                  <>
                    <DocumentIcon className="w-12 h-12 text-github-accent-fg dark:text-github-accent-fg-dark" />
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-github-fg-default dark:text-github-fg-default-dark">{file.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setFile(null)
                        }}
                        className="p-1 hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-subtle-dark rounded-full"
                      >
                        <XMarkIcon className="w-5 h-5 text-github-fg-muted dark:text-github-fg-muted-dark" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <FolderIcon className="w-12 h-12 text-github-fg-muted dark:text-github-fg-muted-dark" />
                    <p className="text-github-fg-default dark:text-github-fg-default-dark">
                      {isDragActive ? (
                        "Drop your job description here"
                      ) : (
                        "Drag and drop job description, or click to browse"
                      )}
                    </p>
                    <p className="text-sm text-github-fg-muted dark:text-github-fg-muted-dark">
                      Supports PDF, DOCX, and TXT files up to 10MB
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Shortlisting Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="minScore" className="block text-sm font-medium text-github-fg-default dark:text-github-fg-default-dark mb-2">
                Minimum Score (0-100)
              </label>
              <input
                type="number"
                id="minScore"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="github-input"
              />
            </div>
            <div>
              <label htmlFor="limit" className="block text-sm font-medium text-github-fg-default dark:text-github-fg-default-dark mb-2">
                Maximum Results (optional)
              </label>
              <input
                type="number"
                id="limit"
                min="1"
                value={limit || ''}
                onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="No limit"
                className="github-input"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleShortlist}
              disabled={
                (inputMethod === 'text' && !jobDescription.trim()) ||
                (inputMethod === 'file' && !file) ||
                shortlistByText.isPending ||
                shortlistByFile.isPending
              }
              className={`btn-github-primary ${
                (inputMethod === 'text' && !jobDescription.trim()) ||
                (inputMethod === 'file' && !file) ||
                shortlistByText.isPending ||
                shortlistByFile.isPending
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <BriefcaseIcon className="w-5 h-5 mr-2" />
              {shortlistByText.isPending || shortlistByFile.isPending ? (
                <span className="inline-flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Start Shortlisting'
              )}
            </button>
            
            {result && (
              <button
                onClick={clearAll}
                className="btn-github"
              >
                Clear Results
              </button>
            )}
          </div>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <MotionDiv
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
                {/* Results Summary */}
                <div className="github-card bg-github-accent-subtle dark:bg-github-accent-subtle-dark border-github-accent-muted dark:border-github-accent-muted-dark">
                  <h3 className="text-lg font-medium text-github-accent-fg dark:text-github-accent-fg-dark mb-4">Shortlisting Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-github-accent-fg dark:text-github-accent-fg-dark">{result.total_candidates}</div>
                      <div className="text-sm text-github-accent-fg dark:text-github-accent-fg-dark">Total Candidates</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-github-success-fg dark:text-github-success-fg-dark">{result.shortlisted_candidates.length}</div>
                      <div className="text-sm text-github-success-fg dark:text-github-success-fg-dark">Shortlisted</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-github-attention-fg dark:text-github-attention-fg-dark">{minScore}+</div>
                      <div className="text-sm text-github-attention-fg dark:text-github-attention-fg-dark">Min Score</div>
                    </div>
                  </div>
                </div>

                {/* Shortlisted Candidates */}
                {result.shortlisted_candidates.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark mb-4">Shortlisted Candidates</h3>
                    <div className="space-y-4">
                      {result.shortlisted_candidates.map((candidate, index) => (
                        <div key={candidate.candidate_id} className="github-card">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-github-accent-subtle dark:bg-github-accent-subtle-dark rounded-full flex items-center justify-center text-github-accent-fg dark:text-github-accent-fg-dark font-medium">
                                  #{index + 1}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark">{candidate.candidate_name}</h4>
                                <p className="text-sm text-github-fg-muted dark:text-github-fg-muted-dark">Candidate ID: {candidate.candidate_id}</p>
                              </div>
                            </div>
                            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getScoreColor(candidate.score)}`}>
                              {getScoreIcon(candidate.score)}
                              <span className="font-medium">{candidate.score}/100</span>
                            </div>
                          </div>

                          <div className="mb-4">
                            <h5 className="font-medium text-github-fg-default dark:text-github-fg-default-dark mb-2">Assessment</h5>
                            <p className="text-github-fg-muted dark:text-github-fg-muted-dark">{candidate.reasoning}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-github-success-fg dark:text-github-success-fg-dark mb-2">Strengths</h5>
                              <ul className="text-sm text-github-fg-muted dark:text-github-fg-muted-dark space-y-1">
                                {candidate.strengths.map((strength, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-github-success-fg dark:text-github-success-fg-dark mr-2">•</span>
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-github-danger-fg dark:text-github-danger-fg-dark mb-2">Areas for Consideration</h5>
                              <ul className="text-sm text-github-fg-muted dark:text-github-fg-muted-dark space-y-1">
                                {candidate.weaknesses.map((weakness, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-github-danger-fg dark:text-github-danger-fg-dark mr-2">•</span>
                                    {weakness}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChartBarIcon className="w-12 h-12 text-github-fg-muted dark:text-github-fg-muted-dark mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark mb-2">No Candidates Match</h3>
                    <p className="text-github-fg-muted dark:text-github-fg-muted-dark">
                      No candidates scored above {minScore}. Try lowering the minimum score or refining the job description.
                    </p>
                  </div>
                )}

                {/* Scoring Criteria */}
                <div className="github-card bg-github-canvas-subtle dark:bg-github-canvas-subtle-dark">
                  <h4 className="font-medium text-github-fg-default dark:text-github-fg-default-dark mb-2">Scoring Criteria</h4>
                  <pre className="text-sm text-github-fg-muted dark:text-github-fg-muted-dark whitespace-pre-wrap">{result.scoring_criteria}</pre>
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Unified candidates view with toggle functionality */
        <div className="space-y-6">
          <div className="github-card bg-github-accent-subtle dark:bg-github-accent-subtle-dark border-github-accent-muted dark:border-github-accent-muted-dark">
            <div className="flex items-center space-x-3 mb-4">
              <UserGroupIcon className="w-6 h-6 text-github-accent-fg dark:text-github-accent-fg-dark" />
              <h3 className="text-lg font-medium text-github-accent-fg dark:text-github-accent-fg-dark">All Candidates</h3>
            </div>
            <p className="text-sm text-github-accent-fg dark:text-github-accent-fg-dark">
              Manage all candidates with manual status controls and resume viewing capabilities.
            </p>
          </div>

          {candidatesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-accent-fg dark:border-github-accent-fg-dark"></div>
            </div>
          ) : allCandidates && allCandidates.length > 0 ? (
            <div className="space-y-4">
              {allCandidates.map((candidate) => (
                <div key={candidate.candidate_id} className="github-card">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-github-canvas-subtle dark:bg-github-canvas-subtle-dark rounded-full flex items-center justify-center text-github-fg-default dark:text-github-fg-default-dark font-medium border border-github-border-default dark:border-github-border-default-dark">
                          {candidate.full_name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark">{candidate.full_name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-github-fg-muted dark:text-github-fg-muted-dark">
                          <span>ID: {candidate.candidate_id}</span>
                          {candidate.email && <span>{candidate.email}</span>}
                          {candidate.years_experience && <span>{candidate.years_experience} years exp</span>}
                        </div>
                        {candidate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {candidate.skills.slice(0, 5).map((skill, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-github-neutral-subtle dark:bg-github-neutral-subtle-dark text-github-fg-muted dark:text-github-fg-muted-dark border border-github-border-default dark:border-github-border-default-dark">
                                {skill}
                              </span>
                            ))}
                            {candidate.skills.length > 5 && (
                              <span className="text-xs text-github-fg-muted dark:text-github-fg-muted-dark">+{candidate.skills.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        candidate.status === 'shortlisted'
                          ? 'bg-github-success-subtle dark:bg-github-success-subtle-dark text-github-success-fg dark:text-github-success-fg-dark border border-github-success-muted dark:border-github-success-muted-dark'
                          : candidate.status === 'rejected'
                          ? 'bg-github-danger-subtle dark:bg-github-danger-subtle-dark text-github-danger-fg dark:text-github-danger-fg-dark border border-github-danger-muted dark:border-github-danger-muted-dark'
                          : 'bg-github-neutral-subtle dark:bg-github-neutral-subtle-dark text-github-fg-default dark:text-github-fg-default-dark border border-github-border-default dark:border-github-border-default-dark'
                      }`}>
                        {candidate.status === 'shortlisted' && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                        {candidate.status === 'pending' && <ClockIcon className="w-3 h-3 mr-1" />}
                        {candidate.status}
                      </span>

                      {/* Status Toggle Buttons */}
                      <div className="flex space-x-1">
                        <button
                          onClick={() => updateStatus.mutate({ 
                            candidateId: candidate.candidate_id, 
                            status: candidate.status === 'shortlisted' ? 'pending' : 'shortlisted' 
                          })}
                          disabled={updateStatus.isPending}
                          className={`btn-github text-xs ${
                            candidate.status === 'shortlisted'
                              ? 'btn-github hover:bg-github-neutral-subtle dark:hover:bg-github-neutral-subtle-dark'
                              : 'btn-github-primary'
                          }`}
                        >
                          {updateStatus.isPending ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                          ) : candidate.status === 'shortlisted' ? (
                            'Unshortlist'
                          ) : (
                            'Shortlist'
                          )}
                        </button>

                        {/* View Resume Button */}
                        {candidate.resume_available && (
                          <button
                            onClick={() => handleViewResume(candidate.candidate_id)}
                            className="btn-github text-xs hover:bg-github-accent-subtle dark:hover:bg-github-accent-subtle-dark hover:text-github-accent-fg dark:hover:text-github-accent-fg-dark"
                          >
                            <EyeIcon className="w-3 h-3 mr-1" />
                            View Resume
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserGroupIcon className="w-12 h-12 text-github-fg-muted dark:text-github-fg-muted-dark mx-auto mb-4" />
              <h3 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark mb-2">No Candidates Found</h3>
              <p className="text-github-fg-muted dark:text-github-fg-muted-dark">
                Upload some resumes first to see candidates here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Resume Modal */}
      <AnimatePresence>
        {resumeModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setResumeModal({ isOpen: false, url: '', filename: '' })}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-github-canvas-default dark:bg-github-canvas-default-dark rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-github-border-default dark:border-github-border-default-dark">
                <h3 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark">
                  {resumeModal.filename}
                </h3>
                <button
                  onClick={() => setResumeModal({ isOpen: false, url: '', filename: '' })}
                  className="p-1 hover:bg-github-canvas-subtle dark:hover:bg-github-canvas-subtle-dark rounded-full"
                >
                  <XMarkIcon className="w-5 h-5 text-github-fg-muted dark:text-github-fg-muted-dark" />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
                <iframe
                  src={resumeModal.url}
                  className="w-full h-[600px] border border-github-border-default dark:border-github-border-default-dark rounded"
                  title="Resume Preview"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
