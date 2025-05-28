import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
});

export interface UploadResponse {
  extracted_text: string;
  parsed_data?: string;
  candidate_id?: number;
}

export interface FileProcessingResult {
  filename: string;
  status: 'success' | 'error' | 'duplicate';
  candidate_id?: number;
  extracted_text?: string;
  parsed_data?: string;
  message?: string;
  existing_candidate_id?: number;
}

export interface BatchProcessingResponse {
  batch_id: string;
  total_files: number;
  successful: number;
  failed: number;
  duplicates: number;
  results: FileProcessingResult[];
}

export interface Candidate {
  candidate_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  years_experience: number | null;
  status: string;
  created_at: string | null;
  resume_available: boolean;
  original_filename: string | null;
  skills: string[];
}

export interface ParsedData {
  full_name: string;
  email?: string;
  phone?: string;
  location?: string;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  work_experience: Array<{
    company: string;
    position: string;
    duration: string;
  }>;
  skills: string[];
  years_experience?: number;
}

export interface CandidateScore {
  candidate_id: number;
  candidate_name: string;
  score: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
}

export interface ShortlistingResult {
  job_description: string;
  total_candidates: number;
  shortlisted_candidates: CandidateScore[];
  scoring_criteria: string;
}

export const resumeApi = {
  uploadResume: async (file: File, parse: boolean = true, saveToDb: boolean = true): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('parse', String(parse));
    formData.append('save_to_db', String(saveToDb));
    
    const response = await api.post<UploadResponse>('/upload-resume/', formData);
    return response.data;
  },

  uploadResumesBatch: async (files: File[], parse: boolean = true, saveToDb: boolean = true): Promise<BatchProcessingResponse> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('parse', String(parse));
    formData.append('save_to_db', String(saveToDb));
    
    const response = await api.post<BatchProcessingResponse>('/upload-resumes-batch/', formData);
    return response.data;
  },

  parseText: async (text: string): Promise<{ parsed_data: string }> => {
    const formData = new FormData();
    formData.append('text', text);
    const response = await api.post<{ parsed_data: string }>('/parse-text/', formData);
    return response.data;
  },

  getCandidates: async (limit: number = 100, status?: string): Promise<Candidate[]> => {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (status) params.append('status', status);
    
    const response = await api.get<Candidate[]>('/candidates/?' + params.toString());
    return response.data;
  },

  shortlistCandidate: async (candidateId: number): Promise<Candidate> => {
    const response = await api.post(`/candidates/${candidateId}/shortlist`);
    return response.data;
  },

  viewResume: async (candidateId: number): Promise<{
    resume_url: string;
    filename: string;
    file_type?: string;
  }> => {
    const response = await api.get(`/resumes/${candidateId}/view`);
    return response.data;
  },

  initDb: async (): Promise<{ message: string }> => {
    const response = await api.post('/init-db');
    return response.data;
  },

  shortlistByDescription: async (
    jobDescription: string, 
    minScore: number = 70, 
    limit?: number
  ): Promise<ShortlistingResult> => {
    const formData = new FormData();
    formData.append('job_description', jobDescription);
    formData.append('min_score', String(minScore));
    if (limit) formData.append('limit', String(limit));
    
    const response = await api.post<ShortlistingResult>('/shortlist-by-description/', formData);
    return response.data;
  },

  shortlistByFile: async (
    file: File, 
    minScore: number = 70, 
    limit?: number
  ): Promise<ShortlistingResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('min_score', String(minScore));
    if (limit) formData.append('limit', String(limit));
    
    const response = await api.post<ShortlistingResult>('/shortlist-by-file/', formData);
    return response.data;
  },

  getShortlistingHistory: async (): Promise<{ message: string }> => {
    const response = await api.get('/shortlisting-history/');
    return response.data;
  },
};
