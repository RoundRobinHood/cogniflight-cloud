from jsonrpc import dispatcher
import numpy as np
import cv2
import os
import tempfile
from pathlib import Path
from bson.objectid import ObjectId
from pymongo import MongoClient
from gridfs import GridFS

# Import InsightFace
try:
    from insightface.app import FaceAnalysis
except ImportError:
    print("Warning: InsightFace not installed. Install with: pip install insightface")
    FaceAnalysis = None

# Global face analyzer instance (initialized lazily)
_face_analyzer = None
FACE_MODEL_NAME = os.getenv('FACE_MODEL_NAME', 'buffalo_s')

# MongoDB connection (initialized lazily)
_mongo_client = None
_gridfs = None
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
MONGO_DB = os.getenv('MONGO_DB', 'cogniflight')


def get_face_analyzer():
    """Get or initialize the face analyzer singleton"""
    global _face_analyzer

    if _face_analyzer is None:
        if FaceAnalysis is None:
            raise RuntimeError("InsightFace not installed. Install with: pip install insightface")

        print(f"Initializing InsightFace model '{FACE_MODEL_NAME}'...", flush=True)
        _face_analyzer = FaceAnalysis(
            name=FACE_MODEL_NAME,
            providers=["CPUExecutionProvider"]
        )
        _face_analyzer.prepare(ctx_id=0, det_size=(640, 640))
        print("Face analyzer initialized successfully", flush=True)

    return _face_analyzer


def get_gridfs():
    """Get or initialize MongoDB GridFS connection"""
    global _mongo_client, _gridfs

    if _gridfs is None:
        print(f"Connecting to MongoDB at {MONGO_URI}...", flush=True)
        _mongo_client = MongoClient(MONGO_URI)
        db = _mongo_client[MONGO_DB]
        _gridfs = GridFS(db)
        print("GridFS connection established", flush=True)

    return _gridfs


def normalize_embedding(embedding):
    """Normalize embedding to unit length (L2 normalization)"""
    norm = np.linalg.norm(embedding)
    if norm > 1e-8:  # Avoid division by very small numbers
        return embedding / norm
    return embedding


@dispatcher.add_method
def generate_face_embedding(image_bytes, detection_threshold=0.5):
    """
    Generate face embedding from image bytes using InsightFace.

    Args:
        image_bytes: Base64-encoded or raw bytes of the image
        detection_threshold: Minimum confidence for face detection (default: 0.5)

    Returns:
        dict with:
            - success: bool
            - embedding: list of 512 floats (normalized to unit length) if successful
            - confidence: float, detection confidence score
            - error: str, error message if failed
            - face_count: int, number of faces detected
    """
    try:
        # Get face analyzer
        analyzer = get_face_analyzer()

        # Handle base64 encoding if present
        if isinstance(image_bytes, str):
            import base64
            image_bytes = base64.b64decode(image_bytes)

        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return {
                "success": False,
                "error": "Failed to decode image",
                "face_count": 0
            }

        # Detect faces
        faces = analyzer.get(image)

        if not faces:
            return {
                "success": False,
                "error": "No face detected in image",
                "face_count": 0
            }

        # Use the first/largest face
        face = faces[0]

        # Check detection confidence
        detection_score = getattr(face, 'det_score', 1.0)

        if detection_score < detection_threshold:
            return {
                "success": False,
                "error": f"Face detection confidence too low: {detection_score:.3f} < {detection_threshold}",
                "confidence": float(detection_score),
                "face_count": len(faces)
            }

        # Extract and normalize embedding
        embedding = face.embedding
        embedding_normalized = normalize_embedding(embedding)

        return {
            "success": True,
            "embedding": embedding_normalized.tolist(),  # Convert to list for JSON serialization
            "confidence": float(detection_score),
            "face_count": len(faces),
            "embedding_dim": len(embedding_normalized)
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Face embedding generation failed: {str(e)}",
            "face_count": 0
        }


@dispatcher.add_method
def generate_face_embedding_from_file(file_path, detection_threshold=0.5):
    """
    Generate face embedding from image file path.

    Args:
        file_path: Path to the image file
        detection_threshold: Minimum confidence for face detection (default: 0.5)

    Returns:
        dict with same format as generate_face_embedding
    """
    try:
        # Read image file
        with open(file_path, 'rb') as f:
            image_bytes = f.read()

        return generate_face_embedding(image_bytes, detection_threshold)

    except FileNotFoundError:
        return {
            "success": False,
            "error": f"Image file not found: {file_path}",
            "face_count": 0
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to read image file: {str(e)}",
            "face_count": 0
        }


@dispatcher.add_method
def generate_multiple_face_embeddings(image_bytes, detection_threshold=0.5, max_faces=5):
    """
    Generate face embeddings for multiple faces in an image.

    Args:
        image_bytes: Base64-encoded or raw bytes of the image
        detection_threshold: Minimum confidence for face detection (default: 0.5)
        max_faces: Maximum number of faces to process (default: 5)

    Returns:
        dict with:
            - success: bool
            - embeddings: list of dicts, each containing embedding and confidence
            - face_count: int, total number of faces detected
            - error: str, error message if failed
    """
    try:
        # Get face analyzer
        analyzer = get_face_analyzer()

        # Handle base64 encoding if present
        if isinstance(image_bytes, str):
            import base64
            image_bytes = base64.b64decode(image_bytes)

        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return {
                "success": False,
                "error": "Failed to decode image",
                "face_count": 0,
                "embeddings": []
            }

        # Detect faces
        faces = analyzer.get(image)

        if not faces:
            return {
                "success": False,
                "error": "No faces detected in image",
                "face_count": 0,
                "embeddings": []
            }

        # Process up to max_faces
        embeddings_list = []
        for i, face in enumerate(faces[:max_faces]):
            detection_score = getattr(face, 'det_score', 1.0)

            if detection_score >= detection_threshold:
                embedding = face.embedding
                embedding_normalized = normalize_embedding(embedding)

                embeddings_list.append({
                    "embedding": embedding_normalized.tolist(),
                    "confidence": float(detection_score),
                    "face_index": i
                })

        return {
            "success": True,
            "embeddings": embeddings_list,
            "face_count": len(faces),
            "processed_count": len(embeddings_list)
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Face embedding generation failed: {str(e)}",
            "face_count": 0,
            "embeddings": []
        }


@dispatcher.add_method
def generate_face_embedding_from_objectid(object_id, detection_threshold=0.5):
    """
    Generate face embedding from a pilot image stored in GridFS using ObjectID.

    This is the main function you'll use to get embeddings for pilot authentication.

    Args:
        object_id: String representation of MongoDB ObjectID (e.g., "507f1f77bcf86cd799439011")
        detection_threshold: Minimum confidence for face detection (default: 0.5)

    Returns:
        dict with:
            - success: bool
            - embedding: list of 512 floats (normalized) if successful
            - confidence: float, detection confidence score
            - error: str, error message if failed
            - face_count: int, number of faces detected

    Example:
        result = generate_face_embedding_from_objectid("507f1f77bcf86cd799439011")
        if result['success']:
            embedding = result['embedding']  # Send this to edge node
    """
    try:
        # Get GridFS connection
        fs = get_gridfs()

        # Convert string to ObjectID
        try:
            oid = ObjectId(object_id)
        except Exception as e:
            return {
                "success": False,
                "error": f"Invalid ObjectID format: {str(e)}",
                "face_count": 0
            }

        # Download image from GridFS
        try:
            grid_out = fs.get(oid)
            image_bytes = grid_out.read()
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to retrieve image from GridFS: {str(e)}",
                "face_count": 0
            }

        # Generate embedding using existing function
        return generate_face_embedding(image_bytes, detection_threshold)

    except Exception as e:
        return {
            "success": False,
            "error": f"Face embedding generation failed: {str(e)}",
            "face_count": 0
        }


@dispatcher.add_method
def compare_face_embeddings(embedding1, embedding2):
    """
    Calculate cosine similarity between two face embeddings.

    Args:
        embedding1: List of 512 floats
        embedding2: List of 512 floats

    Returns:
        dict with:
            - success: bool
            - similarity: float, cosine similarity score (-1 to 1)
            - is_match: bool, whether similarity exceeds typical threshold (0.4)
            - error: str, error message if failed
    """
    try:
        emb1 = np.array(embedding1, dtype=np.float32)
        emb2 = np.array(embedding2, dtype=np.float32)

        # Normalize
        emb1_norm = normalize_embedding(emb1)
        emb2_norm = normalize_embedding(emb2)

        # Calculate cosine similarity (dot product of normalized vectors)
        similarity = float(np.dot(emb1_norm, emb2_norm))

        # Default threshold used by authenticator
        RECOGNITION_THRESHOLD = 0.4

        return {
            "success": True,
            "similarity": similarity,
            "is_match": similarity >= RECOGNITION_THRESHOLD,
            "threshold_used": RECOGNITION_THRESHOLD
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Comparison failed: {str(e)}",
            "similarity": 0.0,
            "is_match": False
        }
