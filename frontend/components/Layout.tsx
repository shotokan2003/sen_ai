'use client'

import { Toaster } from 'react-hot-toast'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Resume Processing System
          </h1>
        </header>
        {children}
      </div>
      <Toaster />
    </div>
  )
}
