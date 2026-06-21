# Gunakan image Python ringan
FROM python:3.10-slim

# Hugging Face Spaces mengharuskan aplikasi berjalan sebagai non-root user (uid 1000)
RUN useradd -m -u 1000 user

# Set direktori kerja di dalam container
WORKDIR /app

# Salin file requirements terlebih dahulu untuk caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Salin seluruh kode backend ke dalam container dan ubah kepemilikannya ke user 'user'
COPY --chown=user:user . /app

# Pindah ke user non-root
USER user

# Pastikan folder data dapat ditulisi (karena backend Anda menyimpan file pkl di sana)
RUN mkdir -p /app/data/users

# Expose port 7860 yang merupakan port standar untuk Hugging Face Spaces
EXPOSE 7860

# Jalankan server FastAPI menggunakan uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
