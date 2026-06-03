import pytesseract
from PIL import Image
import logging
import shutil

class MockTesseract:
    """Fallback if Tesseract binary is not found."""
    @staticmethod
    def image_to_string(image, **kwargs):
        # Return some sample text if we can't run real OCR
        return "INVOICE\nVendor: AMAZON WEB SERVICES\nDate: 2023-05-15\nTotal: $150.00\nAWS Usage 1 100.00 100.00\nSupport Fee 1 50.00 50.00"

def extract_text(image_path):
    """
    Module 3: OCR Engine
    Uses Tesseract to extract raw text from images.
    """
    try:
        if not shutil.which("tesseract"):
            logging.warning("Tesseract binary not found. Using Mock OCR.")
            return MockTesseract.image_to_string(None)
            
        text = pytesseract.image_to_string(Image.open(image_path))
        return text
    except Exception as e:
        logging.error(f"OCR Extraction failed: {str(e)}")
        return f"Error: {str(e)}"
