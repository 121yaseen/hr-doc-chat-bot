#!/usr/bin/env python3
import sys
import json
import pdfplumber
import traceback

def extract_text_from_pdf(pdf_path):
    """
    Extract text from a PDF file using pdfplumber.
    Returns a dictionary with the extracted text and metadata.
    """
    try:
        text_content = []
        metadata = {}
        
        with pdfplumber.open(pdf_path) as pdf:
            # Extract metadata
            if pdf.metadata:
                metadata = {k: str(v) for k, v in pdf.metadata.items()}
            
            # Extract text from each page
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if page_text:
                    text_content.append(f"--- Page {i+1} ---\n{page_text}")
            
            # Get total number of pages
            metadata['pages'] = len(pdf.pages)
        
        # Combine all text
        full_text = "\n\n".join(text_content)
        
        # If no text was extracted, try to extract tables
        if not full_text.strip():
            table_text = []
            with pdfplumber.open(pdf_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    tables = page.extract_tables()
                    if tables:
                        table_text.append(f"--- Page {i+1} Tables ---")
                        for j, table in enumerate(tables):
                            table_text.append(f"Table {j+1}:")
                            for row in table:
                                # Filter out None values and convert to string
                                row_text = " | ".join([str(cell) if cell is not None else "" for cell in row])
                                table_text.append(row_text)
            
            full_text = "\n".join(table_text)
        
        return {
            "success": True,
            "text": full_text,
            "metadata": metadata
        }
    
    except Exception as e:
        error_traceback = traceback.format_exc()
        return {
            "success": False,
            "error": str(e),
            "traceback": error_traceback
        }

if __name__ == "__main__":
    # Check if a file path was provided
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No PDF file path provided"}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = extract_text_from_pdf(pdf_path)
    
    # Output the result as JSON
    print(json.dumps(result)) 