FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required by scipy, numpy, reportlab, and pandas
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gfortran \
    libfreetype6-dev \
    libjpeg-dev \
    libpng-dev \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker layer cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code
COPY . .

# Create the data directory (will be overridden by Railway Volume at runtime)
RUN mkdir -p /app/data/raw /app/data/clean /app/data/users

# Expose default port (Railway will override via $PORT env variable)
EXPOSE 8000

# Use shell form so $PORT env variable from Railway is correctly expanded
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
