FROM python:3.11-slim

# GDAL/HDF5 system deps (IMERG uses HDF5 format)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libhdf5-dev libnetcdf-dev gcc g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py .

ENV PYTHONUNBUFFERED=1
ENV PORT=8080

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
