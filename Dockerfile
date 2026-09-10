# Build the React client first, then serve it from the FastAPI application.
FROM node:22-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libxcb1 \
    libxext6 \
    libxrender1 \
    libsm6 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.deploy.txt ./
RUN pip install --no-cache-dir -r requirements.deploy.txt
COPY . ./
COPY --from=frontend-build /build/frontend/dist ./frontend/dist
ENV PORT=8000
CMD sh -c "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"
