FROM ollama/ollama:latest

# Check https://ollama.com/library/gemma4 for other tags (e2b/e4b/12b/26b/31b) —
# 12b fits comfortably in one L4's 24GB VRAM alongside cpu=8/memory=32Gi from IaaC/variables.tf.
ARG MODEL_NAME=gemma4:12b

ENV OLLAMA_HOST=0.0.0.0:8080
ENV MODEL_NAME=${MODEL_NAME}

# Bake the model into the image at build time so a cold-started Cloud Run
# instance doesn't have to pull multi-GB weights before it can serve.
RUN (ollama serve &) && sleep 5 && ollama pull "${MODEL_NAME}"

EXPOSE 8080

ENTRYPOINT ["ollama", "serve"]
