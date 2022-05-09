source .env

docker stop sep6-api
docker rm sep6-api
docker run -itd --name sep6-api \
    --restart always \
    -v $(pwd)/.env:/app/.env \
    -p $PORT:$PORT \
    sep6-api:latest