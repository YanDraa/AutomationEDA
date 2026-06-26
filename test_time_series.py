import sys, os
import pandas as pd
import numpy as np

# Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

# Import the function
from backend.backend.visualization import generate_time_series_plot

# Create sample data
df = pd.DataFrame({
    'date': pd.date_range(start='2023-01-01', periods=10, freq='D'),
    'value': np.arange(10)
})

options = generate_time_series_plot(df, 'date', 'value')
print('Series count:', len(options.get('series', [])))
print('Series names:', [s.get('name') for s in options.get('series', [])])
