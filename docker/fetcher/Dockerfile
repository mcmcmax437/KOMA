FROM python:3.12-slim-bookworm
WORKDIR /app
# Firefox runtime libraries that Camoufox needs.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libgtk-3-0 libx11-xcb1 libasound2 libdbus-glib-1-2 libxt6 libxtst6 libnss3 \
    fonts-liberation ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -U "camoufox[geoip]" fastapi "uvicorn[standard]"
# Download the Camoufox browser build into the image.
RUN python -m camoufox fetch
COPY docker/fetcher/server.py server.py
ENV HOST=0.0.0.0 PORT=3020
EXPOSE 3020
CMD ["sh", "-c", "uvicorn server:app --host $HOST --port $PORT"]
