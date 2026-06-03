from pdf2image import convert_from_path
import os
import logging

def convert_pdf_to_images(pdf_path, output_dir):
    """
    Module 1: PDF Converter
    Converts each page of a PDF into a JPEG image for OCR processing.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    try:
        # Note: requires poppler-utils installed on the system
        images = convert_from_path(pdf_path)
        image_paths = []
        for i, image in enumerate(images):
            path = os.path.join(output_dir, f"page_{i}.jpg")
            image.save(path, "JPEG")
            image_paths.append(path)
        return image_paths
    except Exception as e:
        logging.error(f"PDF conversion failed: {str(e)}")
        raise
