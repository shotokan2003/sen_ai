'use client'

import React, { useEffect } from 'react';
import { useAuth } from '../../src/lib/auth-context';
import { useRouter } from 'next/navigation';

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-github-canvas-default dark:bg-github-dark-canvas-default">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 border-4 border-github-border-muted dark:border-github-dark-border-muted border-t-github-accent-emphasis dark:border-t-github-dark-accent-emphasis rounded-full animate-spin"></div>
          <p className="mt-4 text-github-fg-muted dark:text-github-dark-fg-muted">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }
  return (
    <div className="min-h-screen bg-github-canvas-default dark:bg-github-dark-canvas-default">
      {/* GitHub-style header */}
      <div className="border-b border-github-border-default dark:border-github-dark-border-default bg-github-canvas-default dark:bg-github-dark-canvas-default">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-github-accent-emphasis to-github-success-emphasis dark:from-github-dark-accent-emphasis dark:to-github-dark-success-emphasis rounded-lg flex items-center justify-center shadow-md">
                <svg className="h-6 w-6 text-github-fg-onEmphasis" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <span className="text-2xl font-bold text-github-fg-default dark:text-github-dark-fg-default">
                  Sen AI
                </span>
                <p className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted -mt-1">
                  Intelligent Recruitment Platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ minHeight: 'calc(100vh - 73px)' }}>
        <div className="max-w-md w-full space-y-8">          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-github-accent-emphasis to-github-success-emphasis dark:from-github-dark-accent-emphasis dark:to-github-dark-success-emphasis border border-github-border-default dark:border-github-dark-border-default rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="h-10 w-10 text-github-fg-onEmphasis" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="mt-6 text-4xl font-bold text-github-fg-default dark:text-github-dark-fg-default">
              Sen AI Platform
            </h1>
            <p className="mt-3 text-lg text-github-fg-muted dark:text-github-dark-fg-muted max-w-md mx-auto leading-relaxed">
              Revolutionary AI-powered recruitment platform that transforms how you discover, evaluate, and hire top talent through intelligent resume processing and conversational candidate matching.
            </p>
            
            {/* Technology Stack Badge */}
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-github-accent-subtle dark:bg-github-dark-accent-subtle border border-github-accent-muted dark:border-github-dark-accent-muted rounded-full">
              <svg className="h-4 w-4 text-github-accent-fg dark:text-github-dark-accent-fg mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-github-accent-fg dark:text-github-dark-accent-fg">
                Next.js • Python • AI/ML • Cloud Storage
              </span>
            </div>
          </div>

          {/* Login form */}
          <div className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle border border-github-border-default dark:border-github-dark-border-default rounded-lg shadow-sm p-8">            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-github-fg-default dark:text-github-dark-fg-default mb-2">
                  Welcome to the Future of Recruitment
                </h3>
                <p className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
                  Sign in with your Google account to access your personalized recruitment dashboard
                </p>
              </div>
              
              <button
                onClick={login}
                className="w-full flex justify-center items-center px-4 py-3 bg-github-btn-primary-bg dark:bg-github-dark-btn-primary-bg hover:bg-github-btn-primary-hoverBg dark:hover:bg-github-dark-btn-primary-hoverBg text-github-btn-primary-text dark:text-github-dark-btn-primary-text font-medium rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-github-accent-emphasis dark:focus:ring-github-dark-accent-emphasis focus:ring-offset-2 focus:ring-offset-github-canvas-default dark:focus:ring-offset-github-dark-canvas-default"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              
              <div className="text-center">
                <p className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">
                  By signing in, you agree to our{' '}
                  <a href="#" className="text-github-accent-fg dark:text-github-dark-accent-fg hover:underline">
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="#" className="text-github-accent-fg dark:text-github-dark-accent-fg hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </div>
            {/* Platform Overview & Features */}
          <div className="space-y-6">
            {/* What We Do Section */}
            <div className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle border border-github-border-default dark:border-github-dark-border-default rounded-lg shadow-sm p-6">
              <h4 className="font-semibold text-github-fg-default dark:text-github-dark-fg-default mb-3 text-center">
                🚀 What Sen AI Does
              </h4>
              <p className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted leading-relaxed text-center mb-4">
                Sen AI revolutionizes recruitment by combining cutting-edge artificial intelligence with intuitive user experience. Our platform automates resume processing, provides intelligent candidate matching, and offers conversational AI assistance to help you find the perfect candidates faster than ever before.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start space-x-3 p-3 bg-github-success-subtle dark:bg-github-dark-success-subtle rounded-lg">
                  <svg className="h-5 w-5 text-github-success-fg dark:text-github-dark-success-fg mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="font-medium text-github-fg-default dark:text-github-dark-fg-default">AI-Powered Resume Analysis</span>
                    <p className="text-github-fg-muted dark:text-github-dark-fg-muted mt-1">Automatically extract and analyze skills, experience, and qualifications from resumes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-github-accent-subtle dark:bg-github-dark-accent-subtle rounded-lg">
                  <svg className="h-5 w-5 text-github-accent-fg dark:text-github-dark-accent-fg mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="font-medium text-github-fg-default dark:text-github-dark-fg-default">Intelligent Chatbot Assistant</span>
                    <p className="text-github-fg-muted dark:text-github-dark-fg-muted mt-1">Chat with AI to find candidates based on specific requirements and criteria</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-github-attention-subtle dark:bg-github-dark-attention-subtle rounded-lg">
                  <svg className="h-5 w-5 text-github-attention-fg dark:text-github-dark-attention-fg mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-medium text-github-fg-default dark:text-github-dark-fg-default">Smart Candidate Matching</span>
                    <p className="text-github-fg-muted dark:text-github-dark-fg-muted mt-1">Advanced algorithms match candidates to job requirements with precision scoring</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-github-done-subtle dark:bg-github-dark-done-subtle rounded-lg">
                  <svg className="h-5 w-5 text-github-done-fg dark:text-github-dark-done-fg mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="font-medium text-github-fg-default dark:text-github-dark-fg-default">Pipeline Management</span>
                    <p className="text-github-fg-muted dark:text-github-dark-fg-muted mt-1">Organize and track candidates through your recruitment pipeline efficiently</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Technology Stack Section */}
            <div className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle border border-github-border-default dark:border-github-dark-border-default rounded-lg shadow-sm p-6">
              <h4 className="font-semibold text-github-fg-default dark:text-github-dark-fg-default mb-4 text-center">
                ⚡ Technology Stack
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-lg border border-github-border-muted dark:border-github-dark-border-muted">
                  <div className="text-2xl mb-2">⚛️</div>
                  <div className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">Next.js 14</div>
                  <div className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">Frontend Framework</div>
                </div>
                <div className="p-3 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-lg border border-github-border-muted dark:border-github-dark-border-muted">
                  <div className="text-2xl mb-2">🐍</div>
                  <div className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">Python</div>
                  <div className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">Backend API</div>
                </div>
                <div className="p-3 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-lg border border-github-border-muted dark:border-github-dark-border-muted">
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">Groq AI</div>
                  <div className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">LLM Processing</div>
                </div>
                <div className="p-3 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-lg border border-github-border-muted dark:border-github-dark-border-muted">
                  <div className="text-2xl mb-2">🗄️</div>
                  <div className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">MySQL</div>
                  <div className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">Database</div>
                </div>
                <div className="p-3 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-lg border border-github-border-muted dark:border-github-dark-border-muted">
                  <div className="text-2xl mb-2">🎨</div>
                  <div className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">Tailwind CSS</div>
                  <div className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">Styling</div>
                </div>
                <div className="p-3 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-lg border border-github-border-muted dark:border-github-dark-border-muted">
                  <div className="text-2xl mb-2">☁️</div>
                  <div className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">AWS S3</div>
                  <div className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">File Storage</div>
                </div>
                <div className="p-3 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-lg border border-github-border-muted dark:border-github-dark-border-muted">
                  <div className="text-2xl mb-2">🔐</div>
                  <div className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">OAuth 2.0</div>
                  <div className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">Authentication</div>
                </div>
                <div className="p-3 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-lg border border-github-border-muted dark:border-github-dark-border-muted">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">RAG System</div>
                  <div className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">AI Retrieval</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
