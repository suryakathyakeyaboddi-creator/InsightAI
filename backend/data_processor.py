import pandas as pd
import io

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
    else:
        raise ValueError("Unsupported file format")
        
    df.columns = df.columns.astype(str).str.strip()
    return df

