import pandas as pd
import io
import pdfplumber

def load_and_clean(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Loads file bytes into a pandas DataFrame and cleans column names."""
    if filename.endswith('.csv'):
        # Try different encodings for CSV
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            # Fallback if all else fails (though latin-1 should catch most)
            raise ValueError(f"Unable to decode CSV file with supported encodings.")
    elif filename.endswith('.xlsx'):
        df = pd.read_excel(io.BytesIO(file_bytes))
    elif filename.lower().endswith('.pdf'):
        dfs = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    
                    # Assume first row of the table has headers
                    headers = table[0]
                    # Filter out purely empty columns
                    valid_cols = [i for i, h in enumerate(headers) if h and str(h).strip()]
                    
                    if not valid_cols:
                        continue
                        
                    clean_headers = [str(headers[i]).strip() for i in valid_cols]
                    data = []
                    
                    for row in table[1:]:
                        clean_row = [str(row[i]).strip() if i < len(row) and row[i] is not None else "" for i in valid_cols]
                        data.append(clean_row)
                    
                    if data:
                        df_part = pd.DataFrame(data, columns=clean_headers)
                        dfs.append(df_part)
        
        if not dfs:
            raise ValueError("No tabular data could be found in this PDF.")
            
        df = pd.concat(dfs, ignore_index=True)
    else:
        raise ValueError("Unsupported file format. Please upload CSV, XLSX, or PDF.")
        
    df.columns = df.columns.astype(str).str.strip()
    return df

