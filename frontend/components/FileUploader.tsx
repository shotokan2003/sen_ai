'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FolderIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useMutation } from '@tanstack/react-query'

interface UploadResult {
  extracted_text: string;
  parsed_data?: string;
  candidate_id?: number;
}

interface ParsedResumeData {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  workExperience: Array<{
    company: string;
    position: string;
    duration: string;
  }>;
  skills: string[];
  yearsExperience?: number;
}

interface FileWithPreview extends File {
  preview?: string;
}

// Function to parse markdown data from API into structured format
function parseMarkdownToStructured(markdownData: string): ParsedResumeData {
  const data: ParsedResumeData = {
    fullName: "Unknown",
    email: undefined,
    phone: undefined,
    location: undefined,
    education: [],
    workExperience: [],
    skills: [],
    yearsExperience: undefined
  }
  
  // Split by sections (starting with ##)
  const sections = markdownData.split("## ")
  
  for (const section of sections) {
    if (!section.trim()) continue
    
    const lines = section.trim().split("\n")
    const sectionName = lines[0].trim().toLowerCase()
    const content = lines.slice(1).join("\n").trim()
    
    if (sectionName.includes("full name")) {
      data.fullName = content && content !== "Not found" ? content : "Unknown"
    } else if (sectionName.includes("email")) {
      data.email = content && content !== "Not found" ? content : undefined
    } else if (sectionName.includes("phone")) {
      data.phone = content && content !== "Not found" ? content : undefined
    } else if (sectionName.includes("location")) {
      data.location = content && content !== "Not found" ? content : undefined
    } else if (sectionName.includes("education")) {
      // Process education entries
      const eduEntries = content.split('\n').filter(line => line.startsWith('- '))
      for (const eduEntry of eduEntries) {
        const cleanEntry = eduEntry.substring(2).trim()
        if (cleanEntry.includes(',')) {
          const parts = cleanEntry.split(',').map(p => p.trim())
          data.education.push({
            degree: parts[0] || "",
            institution: parts[1] || "",
            year: parts[2] || ""
          })
        }
      }
    } else if (sectionName.includes("work experience")) {
      // Process work experience entries
      const workEntries = content.split('\n').filter(line => line.startsWith('- '))
      for (const workEntry of workEntries) {
        const cleanEntry = workEntry.substring(2).trim()
        if (cleanEntry.includes(',')) {
          const parts = cleanEntry.split(',').map(p => p.trim())
          data.workExperience.push({
            company: parts[0] || "",
            position: parts[1] || "",
            duration: parts[2] || ""
          })
        }
      }
    } else if (sectionName.includes("skills")) {
      // Process skills
      const skillsText = content.replace('Not found', '').trim()
      if (skillsText) {
        if (skillsText.includes('\n-')) {
          // List format
          const skillEntries = skillsText.split('\n').filter(line => line.startsWith('- '))
          for (const skillEntry of skillEntries) {
            const skill = skillEntry.substring(2).trim()
            if (skill) data.skills.push(skill)
          }
        } else {
          // Comma separated format
          const skills = skillsText.split(',').map(s => s.trim()).filter(s => s)
          data.skills.push(...skills)
        }
      }
    } else if (sectionName.includes("years of experience")) {
      // Extract years of experience
      const yearsText = content.replace('Not found', '0').trim()
      const match = yearsText.match(/(\d+)/)
      if (match) {
        data.yearsExperience = parseInt(match[1])
      }
    }
  }
  
  return data
}

const MotionDiv = motion.div

export default function FileUploader() {
  const [file, setFile] = useState<FileWithPreview | null>(null)
  const [saveToDb, setSaveToDb] = useState(true)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null)
    const upload = useMutation({
    mutationFn: async () => {
      if (!file) return
      
      // Create FormData to match the API exactly like index.html
      const formData = new FormData()
      formData.append('file', file)
      formData.append('parse', 'true') // Always parse since we need the data
      formData.append('save_to_db', saveToDb ? 'true' : 'false')
      
      // Use fetch directly to match the working index.html implementation
      const response = await fetch('http://localhost:8000/upload-resume/', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error uploading file')
      }
      
      return response.json()
    },    onSuccess: (data) => {
      if (data) {
        setResult(data)
        if (data.parsed_data) {
          try {
            // The parsed_data is markdown text, not JSON - we need to parse it differently
            const markdownData = data.parsed_data
            const transformedData = parseMarkdownToStructured(markdownData)
            setParsedData(transformedData)
          } catch (e) {
            console.error('Failed to parse result data:', e)
          }
        }
        toast.success('Resume processed successfully!')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process resume')
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size should not exceed 10MB')
      return
    }
    setFile(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  })

  const handleUpload = async () => {
    if (!file) return
    upload.mutate()
  }

  const clearFile = () => {
    setFile(null)
    setResult(null)
    setParsedData(null)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div 
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          {file ? (
            <>
              <DocumentIcon className="w-12 h-12 text-blue-500" />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFile()
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </>
          ) : (
            <>
              <FolderIcon className="w-12 h-12 text-gray-400" />
              <p className="text-gray-600">
                {isDragActive ? (
                  "Drop your resume here"
                ) : (
                  "Drag and drop your resume, or click to browse"
                )}
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, DOCX, and TXT files up to 10MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={saveToDb}
            onChange={(e) => setSaveToDb(e.target.checked)}
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-600">Save to database</span>
        </label>

        <button
          onClick={handleUpload}
          disabled={!file || upload.isPending}
          className={`px-4 py-2 rounded-md text-white transition-colors
            ${!file || upload.isPending
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {upload.isPending ? (
            <span className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Upload and Process'
          )}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* LLM Processed Results */}
            {parsedData && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Extracted Information</h3>
                  <div className="mt-4 space-y-4 bg-white p-6 rounded-lg shadow-sm">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-700">Name</h4>
                        <p className="text-gray-600">{parsedData.fullName}</p>
                      </div>
                      {parsedData.email && (
                        <div>
                          <h4 className="font-medium text-gray-700">Email</h4>
                          <p className="text-gray-600">{parsedData.email}</p>
                        </div>
                      )}
                      {parsedData.phone && (
                        <div>
                          <h4 className="font-medium text-gray-700">Phone</h4>
                          <p className="text-gray-600">{parsedData.phone}</p>
                        </div>
                      )}
                      {parsedData.location && (
                        <div>
                          <h4 className="font-medium text-gray-700">Location</h4>
                          <p className="text-gray-600">{parsedData.location}</p>
                        </div>
                      )}
                      {parsedData.yearsExperience !== undefined && (
                        <div>
                          <h4 className="font-medium text-gray-700">Years of Experience</h4>
                          <p className="text-gray-600">{parsedData.yearsExperience} years</p>
                        </div>
                      )}
                    </div>

                    {/* Education */}
                    {parsedData.education.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Education</h4>
                        <div className="space-y-2">
                          {parsedData.education.map((edu, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <p className="font-medium text-gray-800">{edu.degree}</p>
                              <p className="text-gray-600">{edu.institution}, {edu.year}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work Experience */}
                    {parsedData.workExperience.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Work Experience</h4>
                        <div className="space-y-3">
                          {parsedData.workExperience.map((exp, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <p className="font-medium text-gray-800">{exp.position}</p>
                              <p className="text-gray-600">{exp.company} • {exp.duration}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {parsedData.skills.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {parsedData.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Raw Text */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Extracted Raw Text</h3>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {result.extracted_text}
                </pre>
              </div>
            </div>

            {/* Database Save Status */}
            {result.candidate_id && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-green-700 font-medium">
                  Resume data saved to database with ID: {result.candidate_id}
                </p>
              </div>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  )
}
