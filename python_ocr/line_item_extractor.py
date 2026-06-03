import re

def extract_line_items(text):
    """
    Module 5: Line Item Extractor
    Attempts to parse table-like structures for individual items.
    """
    items = []
    lines = text.split('\n')
    
    # Common pattern: Description [Quantity] [Unit Price] [Total Price]
    # Example: "AWS EC2 1 120.00 120.00"
    for line in lines:
        # Avoid total lines
        if any(keyword in line.upper() for keyword in ["TOTAL", "SUBTOTAL", "TAX", "VAT", "GST"]):
            continue
            
        match = re.search(r"(.+?)\s+(\d+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})", line)
        if match:
            items.append({
                'description': match.group(1).strip(),
                'quantity': float(match.group(2)),
                'unit_amount': float(match.group(3).replace(',', '')),
                'total_amount': float(match.group(4).replace(',', ''))
            })
            
    return items
