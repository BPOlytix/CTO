import sys
import os
import json
import logging
from pdf_converter import convert_pdf_to_images
from preprocessor import preprocess_image
from ocr_engine import extract_text
from text_parser import parse_fields
from line_item_extractor import extract_line_items
from formatter import format_output

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def process_bill(pdf_path):
    """
    Module 7: Main Coordinator
    Orchestrates the 6 other modules to process a bill.
    """
    output_dir = "temp_ocr_images"
    errors = []
    
    if not os.path.exists(pdf_path):
        return format_output({}, status="failed", errors=[f"File not found: {pdf_path}"])

    try:
        # 1. Convert PDF to images
        try:
            image_paths = convert_pdf_to_images(pdf_path, output_dir)
        except Exception as e:
            # If PDF conversion fails (e.g. no poppler), try processing as a single image
            if pdf_path.lower().endswith(('.png', '.jpg', '.jpeg')):
                image_paths = [pdf_path]
                output_dir = None # Don't cleanup the original image
            else:
                raise e
        
        full_text = ""
        # 2. Process each page
        for img in image_paths:
            # 3. Preprocess
            prepped = preprocess_image(img)
            # 4. OCR
            text = extract_text(prepped)
            full_text += text + "\n"
        
        # 5. Parse Fields
        data = parse_fields(full_text)
        # 6. Extract Line Items
        data['line_items'] = extract_line_items(full_text)
        data['raw_text'] = full_text
        
        # 7. Format Output
        return format_output(data)

    except Exception as e:
        logging.error(f"Pipeline error: {str(e)}")
        return format_output({}, status="failed", errors=[str(e)])
    finally:
        # Cleanup temporary images
        if output_dir and os.path.exists(output_dir):
            for f in os.listdir(output_dir):
                os.remove(os.path.join(output_dir, f))
            os.rmdir(output_dir)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(format_output({}, status="failed", errors=["No file path provided"]))
        sys.exit(1)
    
    result_json = process_bill(sys.argv[1])
    print(result_json)
