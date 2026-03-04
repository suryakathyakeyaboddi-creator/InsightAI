import pandas as pd
df = pd.read_csv("/Users/boddisuryakathyakeya/Desktop/InsightAI/data/sample_sales.csv")
print("Before:\n", df.dtypes)
for col in df.columns:
    if df[col].dtype == 'object':
        try:
            parsed = pd.to_datetime(df[col], format='mixed')
            df[col] = parsed
        except Exception as e:
            try:
                parsed = pd.to_datetime(df[col])
                df[col] = parsed
            except Exception as e2:
                pass
print("\nAfter:\n", df.dtypes)
