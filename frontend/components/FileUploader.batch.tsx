'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  FolderIcon, 
  DocumentIcon, 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ArrowPathIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import { useMutation } from '@tanstack/react-query'
import { resumeApi, type BatchProcessingResponse } from '../src/lib/api'

interface FileWithId extends File {
  id: string
}

export default function FileUploaderBatch() {
  const [files, setFiles] = useState<FileWithId[]>([])
  const [saveToDb, setSaveToDb] = useState(true)
  const [batchResult, setBatchResult] = useState<BatchProcessingResponse | null>(null)
  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('batch')

  // Single file upload mutation (for backward compatibility)
  const uploadSingle = useMutation({
    mutationFn: async () => {
      if (!files[0]) throw new Error('No file selected')
      return resumeApi.uploadResume(files[0], true, saveToDb)
    },
    onSuccess: (data) => {
      if (data) {
        setBatchResult({
          batch_id: 'single-upload',
          total_files: 1,
          successful: 1,
          failed: 0,
          duplicates: 0,
          results: [{
            filename: files[0].name,
            status: 'success',
            candidate_id: data.candidate_id,
            extracted_text: data.extracted_text,
            parsed_data: data.parsed_data,
            message: 'Successfully processed'
          }]
        })
        toast.success('Resume processed successfully!')
      }
    },
    onError: (error: unknown) => {
      console.error('Upload error:', error)
      const message = error instanceof Error ? error.message : 'Failed to process resume'
      toast.error(message)
      setBatchResult({
        batch_id: 'single-upload',
        total_files: 1,
        successful: 0,
        failed: 1,
        duplicates: 0,
        results: [{
          filename: files[0]?.name || 'unknown',
          status: 'error',
          message: message
        }]
      })
    }
  })

  // Batch upload mutation
  const uploadBatch = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error('No files selected')
      return resumeApi.uploadResumesBatch(files, true, saveToDb)
    },
    onSuccess: (data) => {
      if (data) {
        setBatchResult(data)
        toast.success(`Batch processing completed! ${data.successful} successful, ${data.failed} failed, ${data.duplicates} duplicates`)
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to process batch'
      toast.error(message)
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Add unique IDs to files
    const filesWithId: FileWithId[] = acceptedFiles.map(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit per file
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`)
        return null
      }
      return Object.assign(file, { id: `${file.name}-${Date.now()}-${Math.random()}` })
    }).filter(Boolean) as FileWithId[]

    if (uploadMode === 'single') {
      // Single file mode - replace existing file
      setFiles(filesWithId.slice(0, 1))
    } else {
      // Batch mode - add to existing files
      setFiles(prev => [...prev, ...filesWithId])
    }
  }, [uploadMode])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: uploadMode === 'batch'
  })

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const clearAll = () => {
    setFiles([])
    setBatchResult(null)
  }

  const handleUpload = () => {
    if (files.length === 0) {
      toast.error('Please select files to upload')
      return
    }

    if (uploadMode === 'single' || files.length === 1) {
      uploadSingle.mutate()
    } else {
      uploadBatch.mutate()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-github-success-fg dark:text-github-success-fg-dark" />
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-github-danger-fg dark:text-github-danger-fg-dark" />
      case 'duplicate':
        return <ArrowPathIcon className="w-5 h-5 text-github-attention-fg dark:text-github-attention-fg-dark" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-github-success-fg dark:text-github-success-fg-dark bg-github-success-subtle dark:bg-github-success-subtle-dark'
      case 'error':
        return 'text-github-danger-fg dark:text-github-danger-fg-dark bg-github-danger-subtle dark:bg-github-danger-subtle-dark'
      case 'duplicate':
        return 'text-github-attention-fg dark:text-github-attention-fg-dark bg-github-attention-subtle dark:bg-github-attention-subtle-dark'
      default:
        return 'text-github-fg-muted dark:text-github-fg-muted-dark bg-github-canvas-subtle dark:bg-github-canvas-subtle-dark'
    }
  }

  const isUploading = uploadSingle.isPending || uploadBatch.isPending

  return (
    <div className="space-y-6">
      {/* Upload Mode Toggle */}
      <div className="flex space-x-4 border-b border-github-border-default dark:border-github-border-default-dark">
        <button
          onClick={() => {
            setUploadMode('single')
            setFiles(files.slice(0, 1)) // Keep only first file
          }}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            uploadMode === 'single'
              ? 'border-github-accent-fg dark:border-github-accent-fg-dark text-github-accent-fg dark:text-github-accent-fg-dark'
              : 'border-transparent text-github-fg-muted dark:text-github-fg-muted-dark hover:text-github-fg-default dark:hover:text-github-fg-default-dark'
          }`}
        >
          Single Upload
        </button>
        <button
          onClick={() => setUploadMode('batch')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            uploadMode === 'batch'
              ? 'border-github-accent-fg dark:border-github-accent-fg-dark text-github-accent-fg dark:text-github-accent-fg-dark'
              : 'border-transparent text-github-fg-muted dark:text-github-fg-muted-dark hover:text-github-fg-default dark:hover:text-github-fg-default-dark'
          }`}
        >
          Batch Upload
        </button>
      </div>

      {/* File Drop Zone */}
      <div 
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-github-accent-fg dark:border-github-accent-fg-dark bg-github-canvas-subtle dark:bg-github-canvas-subtle-dark' 
            : 'border-github-border-default dark:border-github-border-default-dark hover:border-github-accent-fg dark:hover:border-github-accent-fg-dark'
          } bg-github-canvas-default dark:bg-github-canvas-default-dark`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <FolderIcon className="w-12 h-12 text-github-fg-muted dark:text-github-fg-muted-dark" />
          <p className="text-github-fg-default dark:text-github-fg-default-dark">
            {isDragActive ? (
              `Drop your ${uploadMode === 'batch' ? 'files' : 'file'} here`
            ) : (
              `Drag and drop ${uploadMode === 'batch' ? 'resumes' : 'resume'}, or click to browse`
            )}
          </p>
          <p className="text-sm text-github-fg-muted dark:text-github-fg-muted-dark">
            Supports PDF, DOCX, and TXT files up to 10MB each
            {uploadMode === 'batch' && ' (Maximum 50 files per batch)'}
          </p>
        </div>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="github-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark">
              Selected Files ({files.length})
            </h3>
            <button
              onClick={clearAll}
              className="text-sm text-github-danger-fg dark:text-github-danger-fg-dark hover:underline"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-github-canvas-subtle dark:bg-github-canvas-subtle-dark rounded">
                <div className="flex items-center space-x-2">
                  <DocumentIcon className="w-4 h-4 text-github-accent-fg dark:text-github-accent-fg-dark" />
                  <span className="text-sm text-github-fg-default dark:text-github-fg-default-dark">{file.name}</span>
                  <span className="text-xs text-github-fg-muted dark:text-github-fg-muted-dark">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-github-canvas-default dark:hover:bg-github-canvas-default-dark rounded-full"
                >
                  <XMarkIcon className="w-4 h-4 text-github-fg-muted dark:text-github-fg-muted-dark" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={saveToDb}
            onChange={(e) => setSaveToDb(e.target.checked)}
            className="github-input"
          />
          <span className="text-sm text-github-fg-default dark:text-github-fg-default-dark">Save to database</span>
        </label>
      </div>

      {/* Upload Button */}
      <div className="flex space-x-4">
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading}
          className={`btn-github-primary ${
            files.length === 0 || isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <CloudArrowUpIcon className="w-5 h-5 mr-2" />
          {isUploading ? (
            <span className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {uploadMode === 'batch' && files.length > 1 ? 'Processing Batch...' : 'Processing...'}
            </span>
          ) : (
            `Upload ${uploadMode === 'batch' && files.length > 1 ? 'Batch' : ''} (${files.length} file${files.length > 1 ? 's' : ''})`
          )}
        </button>
        
        {batchResult && (
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
        {batchResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Summary */}
            <div className="github-card bg-github-canvas-subtle dark:bg-github-canvas-subtle-dark">
              <h3 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark mb-4">Processing Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-github-fg-default dark:text-github-fg-default-dark">{batchResult.total_files}</div>
                  <div className="text-sm text-github-fg-muted dark:text-github-fg-muted-dark">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-github-success-fg dark:text-github-success-fg-dark">{batchResult.successful}</div>
                  <div className="text-sm text-github-success-fg dark:text-github-success-fg-dark">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-github-danger-fg dark:text-github-danger-fg-dark">{batchResult.failed}</div>
                  <div className="text-sm text-github-danger-fg dark:text-github-danger-fg-dark">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-github-attention-fg dark:text-github-attention-fg-dark">{batchResult.duplicates}</div>
                  <div className="text-sm text-github-attention-fg dark:text-github-attention-fg-dark">Duplicates</div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="github-card">
              <h3 className="text-lg font-medium text-github-fg-default dark:text-github-fg-default-dark mb-4">File Details</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {batchResult.results.map((result, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-github-canvas-subtle dark:bg-github-canvas-subtle-dark rounded">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="font-medium text-github-fg-default dark:text-github-fg-default-dark">{result.filename}</div>
                        <div className="text-sm text-github-fg-muted dark:text-github-fg-muted-dark">{result.message}</div>
                        {result.candidate_id && (
                          <div className="text-sm text-github-success-fg dark:text-github-success-fg-dark">
                            Candidate ID: {result.candidate_id}
                          </div>
                        )}
                        {result.existing_candidate_id && (
                          <div className="text-sm text-github-attention-fg dark:text-github-attention-fg-dark">
                            Existing Candidate ID: {result.existing_candidate_id}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
