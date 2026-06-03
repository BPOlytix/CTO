import json

def format_output(data, status="success", errors=None):
    """
    Module 6: Formatter
    Standardizes the output format for the Node.js wrapper.
    """
    output = {
        "status": status,
        "extracted": data,
        "errors": errors or []
    }
    return json.dumps(output, indent=2)
