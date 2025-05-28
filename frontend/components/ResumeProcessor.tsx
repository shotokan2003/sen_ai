'use client'

import { m as motion } from 'framer-motion'
import { Tab } from '@headlessui/react'
import clsx from 'clsx'
import dynamic from 'next/dynamic'

// Dynamically import components to avoid SSR issues with client components
const FileUploader = dynamic(() => import('./FileUploader'), { ssr: false })
const CandidateList = dynamic(() => import('./CandidateList'), { ssr: false })

const tabs = [
  { name: 'Upload Resume', id: 'upload' },
  { name: 'Candidates', id: 'candidates' },
]

export default function ResumeProcessor() {
  return (
    <Tab.Group>
      <Tab.List className="flex space-x-2 rounded-xl bg-blue-900/20 p-1 mb-4">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className={({ selected }) =>
              clsx(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white shadow text-blue-700'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            {tab.name}
          </Tab>
        ))}
      </Tab.List>

      <Tab.Panels className="mt-2">
        {/* Upload Resume Panel */}
        <Tab.Panel>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-xl bg-white p-6 shadow-lg"
          >
            <FileUploader />
          </motion.div>
        </Tab.Panel>

        {/* Candidates List Panel */}
        <Tab.Panel>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-xl bg-white p-6 shadow-lg"
          >
            <CandidateList />
          </motion.div>
        </Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  )
}
