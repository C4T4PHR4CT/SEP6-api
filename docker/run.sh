source ./../.env

docker stop sep6-api
docker rm sep6-api
docker run -itd --name sep6-api \
    --restart always \
    --env-file ./../.env \
    -p $PORT:$PORT \
    sep6-api:latest