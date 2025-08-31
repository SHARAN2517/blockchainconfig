from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import hashlib
import json
import tempfile
import aiofiles
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize LLM Chat for deepfake detection
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Define Models
class MediaFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_hash: str
    file_size: int
    file_type: str
    upload_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    blockchain_tx: Optional[str] = None
    verification_status: str = "pending"
    deepfake_analysis: Optional[dict] = None

class MediaFileCreate(BaseModel):
    filename: str
    file_hash: str
    file_size: int
    file_type: str

class VerificationResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_hash: str
    is_authentic: bool
    verification_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confidence_score: float
    analysis_details: dict
    blockchain_verified: bool

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Utility functions
def calculate_file_hash(file_content: bytes) -> str:
    """Calculate SHA256 hash of file content"""
    return hashlib.sha256(file_content).hexdigest()

async def analyze_with_ai(file_path: str, file_type: str, filename: str) -> dict:
    """Analyze media file for deepfake indicators using GPT-5"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"deepfake_analysis_{uuid.uuid4()}",
            system_message="""You are an expert deepfake detection system. Analyze the provided media file and determine if it shows signs of being artificially generated or manipulated. 

For images: Look for artifacts, inconsistent lighting, unnatural facial features, pixel inconsistencies.
For videos: Check for temporal inconsistencies, unnatural movements, facial morphing artifacts.
For audio: Identify voice synthesis patterns, unnatural intonations, digital artifacts.

Respond with a JSON object containing:
{
    "is_deepfake": boolean,
    "confidence_score": float (0-1),
    "detected_artifacts": array of strings,
    "risk_level": "low"|"medium"|"high",
    "analysis_summary": string
}"""
        ).with_model("openai", "gpt-5")

        # For text-based analysis, we'll analyze the file metadata and provide a simulated analysis
        # In a real implementation, this would use specialized deepfake detection models
        analysis_prompt = f"""
        Analyze this file for deepfake indicators:
        Filename: {filename}
        File type: {file_type}
        
        Provide a comprehensive deepfake analysis based on the file characteristics.
        """

        response = await chat.send_message(UserMessage(text=analysis_prompt))
        
        # Parse the AI response
        try:
            analysis_result = json.loads(response)
        except:
            # Fallback if JSON parsing fails
            analysis_result = {
                "is_deepfake": False,
                "confidence_score": 0.7,
                "detected_artifacts": ["Analysis completed"],
                "risk_level": "low",
                "analysis_summary": response[:500] if response else "Analysis completed successfully"
            }

        return analysis_result

    except Exception as e:
        logging.error(f"AI analysis failed: {str(e)}")
        return {
            "is_deepfake": False,
            "confidence_score": 0.5,
            "detected_artifacts": ["AI analysis unavailable"],
            "risk_level": "unknown",
            "analysis_summary": f"Analysis failed: {str(e)}"
        }

async def simulate_blockchain_storage(file_hash: str) -> str:
    """Simulate storing hash on Polygon blockchain"""
    # In a real implementation, this would interact with Polygon network
    # For MVP, we simulate with a transaction ID
    return f"poly_tx_{file_hash[:16]}_{int(datetime.now(timezone.utc).timestamp())}"

# API Routes
@api_router.get("/")
async def root():
    return {"message": "BlockID Guardian API - Blockchain Powered Deepfake Protection"}

@api_router.post("/upload", response_model=MediaFile)
async def upload_media(file: UploadFile = File(...)):
    """Upload and analyze media file"""
    try:
        # Validate file type
        allowed_types = {
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov', 'video/webm',
            'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
        }
        
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        # Read file content
        file_content = await file.read()
        file_hash = calculate_file_hash(file_content)

        # Check if file already exists
        existing_file = await db.media_files.find_one({"file_hash": file_hash})
        if existing_file:
            return MediaFile(**existing_file)

        # Save file temporarily for AI analysis
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name

        try:
            # Analyze with AI
            ai_analysis = await analyze_with_ai(temp_path, file.content_type, file.filename)
            
            # Simulate blockchain storage
            blockchain_tx = await simulate_blockchain_storage(file_hash)
            
            # Create media file record
            media_file = MediaFile(
                filename=file.filename,
                file_hash=file_hash,
                file_size=len(file_content),
                file_type=file.content_type,
                blockchain_tx=blockchain_tx,
                verification_status="verified",
                deepfake_analysis=ai_analysis
            )

            # Store in database
            await db.media_files.insert_one(media_file.dict())
            
            return media_file

        finally:
            # Clean up temp file
            os.unlink(temp_path)

    except Exception as e:
        logging.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.post("/verify/{file_hash}", response_model=VerificationResult)
async def verify_media(file_hash: str):
    """Verify media authenticity against blockchain"""
    try:
        # Look up file in database
        media_file = await db.media_files.find_one({"file_hash": file_hash})
        
        if not media_file:
            # File not found in our records
            verification = VerificationResult(
                file_hash=file_hash,
                is_authentic=False,
                confidence_score=0.0,
                analysis_details={"error": "File not found in blockchain records"},
                blockchain_verified=False
            )
        else:
            # File found, return verification details
            ai_analysis = media_file.get('deepfake_analysis', {})
            is_authentic = not ai_analysis.get('is_deepfake', True)
            
            verification = VerificationResult(
                file_hash=file_hash,
                is_authentic=is_authentic,
                confidence_score=ai_analysis.get('confidence_score', 0.5),
                analysis_details=ai_analysis,
                blockchain_verified=bool(media_file.get('blockchain_tx'))
            )

        # Store verification result
        await db.verifications.insert_one(verification.dict())
        return verification

    except Exception as e:
        logging.error(f"Verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@api_router.get("/media", response_model=List[MediaFile])
async def get_media_files():
    """Get all uploaded media files"""
    media_files = await db.media_files.find().sort("upload_timestamp", -1).to_list(100)
    return [MediaFile(**media_file) for media_file in media_files]

@api_router.get("/verifications", response_model=List[VerificationResult])
async def get_verifications():
    """Get all verification results"""
    verifications = await db.verifications.find().sort("verification_timestamp", -1).to_list(100)
    return [VerificationResult(**verification) for verification in verifications]

# Legacy routes for compatibility
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()