import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

df = pd.DataFrame({
    'Company': ['Acme Corp', 'Globex', 'Soylent', 'Initech', 'Umbrella Corp'],
    'Sector': ['Tech', 'Manufacturing', 'Food', 'Tech', 'Research'],
    'Revenue_Q1': [1500000, 2400000, 3100000, 950000, 5200000],
    'Revenue_Q2': [1750000, 2300000, 3250000, 1100000, 4800000]
})

fig, ax = plt.subplots(figsize=(8, 4))
ax.axis('tight')
ax.axis('off')
table = ax.table(cellText=df.values, colLabels=df.columns, loc='center', cellLoc='center')
table.scale(1, 1.5)

with PdfPages('sample_report.pdf') as pdf:
    pdf.savefig(fig, bbox_inches='tight')
