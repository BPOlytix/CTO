import re

def parse_fields(text):
    """
    Module 4: Text Parser
    Extracts key fields like Vendor, Date, and Total from raw text using regex.
    """
    data = {}
    
    # Extract Vendor
    vendor_match = re.search(r"(?:Vendor|Supplier|From|Company)[:\s]*(.*)", text, re.I)
    if not vendor_match:
        # Fallback: Check first few lines
        lines = text.split('\n')
        data['vendor'] = lines[0].strip() if lines else "Unknown Vendor"
    else:
        data['vendor'] = vendor_match.group(1).strip()
    
    # Extract Date
    # Matches YYYY-MM-DD or DD/MM/YYYY or Month DD, YYYY
    date_match = re.search(r"(?:Date|Invoice Date)[:\s]*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+ \d{1,2},? \d{4})", text, re.I)
    data['date'] = date_match.group(1).strip() if date_match else ""
    
    # Extract Total Amount
    total_match = re.search(r"(?:Total|Amount Due|Balance|Grand Total)[:\s]*\$?\s*([\d,]+\.\d{2})", text, re.I)
    if total_match:
        data['total'] = float(total_match.group(1).replace(',', ''))
    else:
        # Fallback: largest number with decimals
        amounts = re.findall(r"\$?\s*([\d,]+\.\d{2})", text)
        if amounts:
            parsed_amounts = [float(a.replace(',', '')) for a in amounts]
            data['total'] = max(parsed_amounts)
        else:
            data['total'] = 0.0
            
    return data
