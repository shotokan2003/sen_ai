import os
import io
import tempfile
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
import PyPDF2
import docx
from PIL import Image
import pytesseract
import uvicorn
from typing import List, Optional
from pydantic import BaseModel

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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "null", "file://"],  # Allows all origins including file:// protocol
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
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
    
@app.post("/upload-resume/", response_model=ResponseModel)
async def upload_resume(file: UploadFile = File(...), parse: bool = Form(False)):
    """
    Upload and process a resume file. 
    Set parse=true to extract structured data from the resume.
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
        if parse and extracted_text.strip():
            parsed_data = extract_resume_data(extracted_text)
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        return {
            "extracted_text": extracted_text,
            "parsed_data": parsed_data
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

if __name__ == "__main__":
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
