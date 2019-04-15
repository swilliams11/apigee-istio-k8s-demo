cd mongodb
docker build . --tag gcr.io/$1/mongodb:v1
docker push gcr.io/$1/mongodb:v1

cd ../ratings_mongodb
docker build . --tag gcr.io/$1/ratings:v5 --build-arg service_version=5
docker push gcr.io/$1/ratings:v5
