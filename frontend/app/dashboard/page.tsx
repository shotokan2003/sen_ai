'use client'

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ResumeProcessor from '@/components/ResumeProcessor';
import ChatBot from '@/components/ChatBot';

const DashboardPage: React.FC = () => {
  return (
    <ProtectedRoute>      <div className="space-y-6">
        <div className="bg-github-canvas-subtle rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Candidate Management Dashboard
          </h2>
          <p className="text-gray-600 mb-6">
            Upload resumes, manage candidates, and shortlist applicants for your job openings.
          </p>
        </div>
        
        <ResumeProcessor />
        
        {/* AI Chat Assistant */}
        <ChatBot />
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
