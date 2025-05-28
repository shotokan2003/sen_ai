import os
import io
import tempfile
import json
import uuid
import logging
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Query
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
import PyPDF2
import docx
from PIL import Image
import pytesseract
import uvicorn
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import database module
from database import get_db, Candidate, Education, Skill, WorkExperience, Status, init_db, save_candidate_data, get_all_candidates, shortlist_candidate
from sqlalchemy.orm import Session

# Import S3 storage module
from s3_storage import upload_file_to_s3, generate_presigned_url

try:
    from pdf2image import convert_from_path
except ImportError:
    print("pdf2image is not installed. OCR functionality might be limited.")
    # Fallback function to avoid errors if pdf2image is not installed
    def convert_from_path(*args, **kwargs):
        return []

# Load environment variables
load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

app = FastAPI(title="Resume Processing API")

# Add CORS middleware with more specific configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=False,  # Must be False for wildcard origin
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"],  # Expose all headers
    max_age=3600,  # Cache preflight requests for 1 hour
)

def extract_text_from_pdf(file_path):
    """Extracts text from a PDF file."""
    pdf_reader = PyPDF2.PdfReader(file_path)
    text = ""
    for page_num in range(len(pdf_reader.pages)):
        page = pdf_reader.pages[page_num]
        page_text = page.extract_text()
        text += page_text
    
    # Check if text extraction failed or returned very little text
    if len(text.strip()) < 100:  # Adjust threshold as needed
        print("Standard text extraction yielded minimal results. Attempting OCR...")
        text = extract_text_using_ocr(file_path)
    
    return text

def extract_text_using_ocr(file_path):
    """Extracts text from images/scanned PDFs using OCR."""
    text = ""
    try:
        images = convert_from_path(file_path)
        for image in images:
            text += pytesseract.image_to_string(image)
    except Exception as e:
        print(f"OCR error: {str(e)}")
    
    return text

def extract_text_from_docx(file_path):
    """Extracts text from a Word document."""
    doc = docx.Document(file_path)
    full_text = []
    
    # Extract text from paragraphs
    for para in doc.paragraphs:
        full_text.append(para.text)
    
    # Also extract text from tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                full_text.append(cell.text)
    
    extracted_text = '\n'.join(full_text)
    
    # Check if extracted text is minimal
    if len(extracted_text.strip()) < 100:  # Adjust threshold as needed
        print("Standard text extraction yielded minimal results from DOCX. Attempting OCR on document images...")
        extracted_text = extract_text_from_docx_images(file_path) or extracted_text
    
    return extracted_text

def extract_text_from_docx_images(file_path):
    """Extract text from images embedded in a DOCX file using OCR."""
    try:
        # Load the document
        doc = docx.Document(file_path)
        
        # Extract and process images
        extracted_text = ""
        
        for rel in doc.part.rels.values():
            if "image" in rel.target_ref:
                try:
                    # Get image data
                    image_data = rel.target_part.blob
                    
                    # Create a PIL Image from binary data
                    image = Image.open(io.BytesIO(image_data))
                    
                    # Use OCR to extract text
                    image_text = pytesseract.image_to_string(image)
                    if image_text.strip():
                        extracted_text += image_text + "\n\n"
                except Exception as e:
                    print(f"Error processing image in DOCX: {str(e)}")
                    continue
        
        return extracted_text
    except Exception as e:
        print(f"Error extracting images from DOCX: {str(e)}")
        return ""

def extract_text_from_txt(file_path):
    """Extracts text from a text file."""
    with open(file_path, 'r', encoding='utf-8') as file:
        text = file.read()
    return text

def extract_resume_data(resume_text):
    """Extracts structured data from resume text using Groq API."""
    prompt = f"""Extract ONLY the following information from the resume text provided below:
    - Full Name
    - Email Address
    - Phone Number
    - Location (City, State/Country)
    - Education (Degree, Institution, Year) - list all
    - Work Experience (Company, Position, Duration) - list all
    - Skills (Technical and Soft Skills) - list all (only names like python,nextjs,leadership,etc)
    - Years of Experience - IMPORTANT: If not explicitly stated, calculate this by adding up all work experience durations or estimate based on career progression just show the number no explaination needed

    Resume Text:
    {resume_text}

    Return ONLY the extracted information in this exact format - do not include any additional information, analysis, or commentary:

    ## Full Name
    [Extracted name]

    ## Email Address
    [Extracted email]

    ## Phone Number
    [Extracted phone]

    ## Location
    [Extracted location]

    ## Education
    - [Degree], [Institution], [Year]
    - [Additional education entries]

    ## Work Experience
    - [Company], [Position], [Duration]
    - [Additional work experience entries]

    ## Skills
    [List of extracted skills]

    ## Years of Experience
    [Number of years] - YOU MUST PROVIDE THIS! Calculate if not explicitly stated in resume and display only the number

    If a field is not found, indicate "Not found" for that field only.
    """

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="llama3-70b-8192", # Using LLaMA 3 70B model
        temperature=0.2, # Lower temperature for more consistent and precise output
        max_tokens=1000 # Limit response length to avoid unnecessary content
    )
    return chat_completion.choices[0].message.content

class ResponseModel(BaseModel):
    extracted_text: str
    parsed_data: Optional[str] = None
    candidate_id: Optional[int] = None

class ParsedResumeData(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    education: List[Dict[str, Any]] = []
    work_experience: List[Dict[str, Any]] = []
    skills: List[str] = []
    years_experience: Optional[int] = None

def parse_markdown_data(markdown_data: str) -> ParsedResumeData:
    """
    Parse the markdown text returned by the LLM into a structured format
    """
    data = {
        "full_name": "Unknown",
        "email": None,
        "phone": None,
        "location": None,
        "education": [],
        "work_experience": [],
        "skills": [],
        "years_experience": 0
    }
    
    # Split by sections (starting with ##)
    sections = markdown_data.split("## ")
    for section in sections:
        if not section.strip():
            continue
        
        # Get section name and content
        lines = section.strip().split("\n")
        section_name = lines[0].strip().lower()
        content = "\n".join(lines[1:]).strip()
        
        if "full name" in section_name:
            data["full_name"] = content if content != "Not found" else "Unknown"
        elif "email" in section_name:
            data["email"] = content if content != "Not found" else None
        elif "phone" in section_name:
            data["phone"] = content if content != "Not found" else None
        elif "location" in section_name:
            data["location"] = content if content != "Not found" else None
        elif "education" in section_name:
            # Process education entries
            for edu_entry in content.strip().split('\n'):
                if edu_entry.startswith('- '):
                    edu_entry = edu_entry[2:].strip()  # Remove list marker
                    if ',' in edu_entry:
                        parts = [p.strip() for p in edu_entry.split(',')]
                        edu_dict = {
                            "degree": parts[0] if len(parts) > 0 else "",
                            "institution": parts[1] if len(parts) > 1 else "",
                            "year": parts[2] if len(parts) > 2 else ""
                        }
                        data["education"].append(edu_dict)
        elif "work experience" in section_name:
            # Process work experience entries
            for exp_entry in content.strip().split('\n'):
                if exp_entry.startswith('- '):
                    exp_entry = exp_entry[2:].strip()  # Remove list marker
                    if ',' in exp_entry:
                        parts = [p.strip() for p in exp_entry.split(',')]
                        exp_dict = {
                            "company": parts[0] if len(parts) > 0 else "",
                            "position": parts[1] if len(parts) > 1 else "",
                            "duration": parts[2] if len(parts) > 2 else ""
                        }
                        data["work_experience"].append(exp_dict)
        elif "skills" in section_name:
            # Process skills
            skills_text = content.replace('Not found', '').strip()
            if skills_text:
                # Split by commas, or if in a list format, extract list items
                if '\n-' in skills_text:
                    for skill_line in skills_text.split('\n'):
                        if skill_line.startswith('- '):
                            skill = skill_line[2:].strip()
                            if skill:
                                data["skills"].append(skill)
                else:
                    skills = [s.strip() for s in skills_text.replace(', ', ',').split(',')]
                    data["skills"].extend([s for s in skills if s])
        elif "years of experience" in section_name:
            # Extract years of experience
            years_text = content.replace('Not found', '0').strip()
            # Try to extract just the number
            import re
            match = re.search(r'(\d+)', years_text)
            if match:
                data["years_experience"] = int(match.group(1))
            else:
                try:
                    data["years_experience"] = int(years_text)
                except ValueError:
                    data["years_experience"] = 0
    
    return ParsedResumeData(**data)

class CandidateResponse(BaseModel):
    candidate_id: int
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    years_experience: Optional[int] = None
    status: str = "pending"  # will store the enum value as string
    created_at: Optional[str] = None  # ISO format string
    resume_available: bool = False
    original_filename: Optional[str] = None
    skills: List[str] = []

    class Config:
        from_attributes = True  # This enables ORM model parsing

@app.post("/upload-resume/", response_model=ResponseModel)
async def upload_resume(
    file: UploadFile = File(...), 
    parse: bool = Form(False), 
    save_to_db: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    Upload and process a resume file. 
    Set parse=true to extract structured data from the resume.
    Set save_to_db=true to save the parsed data to the database.
    """
    # Check if file extension is supported
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in ["pdf", "docx", "txt"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF, DOCX, or TXT file.")
    
    # Create a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file:
        temp_file_path = temp_file.name
        content = await file.read()
        temp_file.write(content)
    
    try:
        # Extract text based on file type
        if file_extension == "pdf":
            extracted_text = extract_text_from_pdf(temp_file_path)
        elif file_extension == "docx":
            extracted_text = extract_text_from_docx(temp_file_path)
        elif file_extension == "txt":
            extracted_text = extract_text_from_txt(temp_file_path)
        
        # Parse the resume if requested
        parsed_data = None
        parsed_structured_data = None
        candidate_id = None
        
        if parse and extracted_text.strip():
            parsed_data = extract_resume_data(extracted_text)
            parsed_structured_data = parse_markdown_data(parsed_data)
            
            # Save to database if requested
            if save_to_db:
                # Generate a unique filename to prevent collisions in S3
                original_filename = file.filename
                unique_id = str(uuid.uuid4())
                s3_key = f"resumes/{unique_id}/{original_filename}"
                
                # Upload to S3
                success, s3_url = upload_file_to_s3(temp_file_path, s3_key)
                
                if not success:
                    raise HTTPException(status_code=500, detail=f"Failed to upload file to S3: {s3_url}")
                
                # Generate a presigned URL for temporary access
                presigned_success, presigned_url = generate_presigned_url(s3_key, expiration=3600*24)  # 24 hours
                
                # Save to database with S3 information
                candidate_id = save_candidate_data(
                    parsed_structured_data.dict(),
                    resume_file_path=s3_key,
                    resume_s3_url=presigned_url if presigned_success else s3_url,
                    original_filename=original_filename
                )
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        return {
            "extracted_text": extracted_text,
            "parsed_data": parsed_data,
            "candidate_id": candidate_id
        }
    
    except Exception as e:
        # Clean up temporary file in case of error
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/parse-text/")
async def parse_text(text: str = Form(...)):
    """
    Parse resume text and extract structured information.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    
    try:
        parsed_data = extract_resume_data(text)
        return {"parsed_data": parsed_data}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing text: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "Resume Processing API is running! Use /upload-resume/ endpoint to process resumes."}

@app.get("/candidates/", response_model=List[Dict[str, Any]])
def get_candidates(
    limit: int = Query(100, description="Maximum number of candidates to return"),
    status: Optional[str] = Query(None, description="Filter by status (pending, shortlisted, rejected)"),
    db: Session = Depends(get_db)
):
    """Get a list of all candidates with optional filtering by status"""
    try:
        status_enum = None
        if status:
            try:
                status_enum = Status[status.upper()]
            except KeyError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        candidates = get_all_candidates(limit=limit, status=status_enum)
        
        # Convert SQLAlchemy objects to dictionaries
        result = []
        for candidate in candidates:
            skills = [skill.skill_name for skill in candidate.skills] if candidate.skills else []
            candidate_dict = {
                "candidate_id": candidate.candidate_id,
                "full_name": candidate.full_name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location": candidate.location,
                "years_experience": candidate.years_experience,
                "status": candidate.status.value if candidate.status else "pending",
                "created_at": candidate.created_at.isoformat() if candidate.created_at else None,
                "resume_available": bool(candidate.resume_file_path),
                "original_filename": candidate.original_filename,
                "skills": skills
            }
            result.append(candidate_dict)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/candidates/{candidate_id}/shortlist")
def shortlist_candidate_endpoint(
    candidate_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark a candidate as shortlisted
    """
    success = shortlist_candidate(candidate_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Candidate with ID {candidate_id} not found")
    
    return {"message": f"Candidate with ID {candidate_id} has been shortlisted"}

@app.post("/init-db")
def initialize_database():
    """
    Initialize the database - create tables if they don't exist
    """
    try:
        init_db()
        return {"message": "Database initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database initialization failed: {str(e)}")

@app.get("/resumes/{candidate_id}/view")
async def view_resume(
    candidate_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a URL to view a candidate's resume
    """
    try:
        # Get candidate from database
        candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        
        if not candidate:
            raise HTTPException(status_code=404, detail=f"Candidate with ID {candidate_id} not found")
        
        if not candidate.resume_file_path:
            raise HTTPException(status_code=404, detail="No resume file found for this candidate")
        
        # Check if we need to generate a new presigned URL (if existing one is old)
        # In a production system, you might want to check if the URL is expired
        
        # Generate a new presigned URL with 24 hour expiration
        success, url = generate_presigned_url(candidate.resume_file_path, expiration=3600*24)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to generate URL for resume")
        
        # Return the URL and filename information
        return {
            "resume_url": url,
            "filename": candidate.original_filename or "resume",
            "file_type": candidate.original_filename.split('.')[-1].lower() if candidate.original_filename else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error viewing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
