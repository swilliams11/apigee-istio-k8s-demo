# Kubernetes

This folder contains the yaml files for deploying the application to your Kubernetes environment.  

## File list
* deploy_mongodb_ratings.sh - script to deploy the mongodb.yaml and ratings-mongodb.yaml
* service_entry/firestore-egress.yaml - enables K8S to send requests to Google APIs for firestore.
* mongodb.yaml - deploys the Mongo DB app that uses Mongodb as a backend database.  (TODO)
* ratings-firestore.yaml - deploys the app that use Firestore as a backend database.
* ratings-ingress.yaml - exposes the ratings-firestore and ratings-nondb apps via the istio gateway.
* ratings-mongodb.yaml - deploys the app that uses Mongodb as a backend database.  (TODO)
* ratings-nodb.yaml - deploys the app that uses local memory to store the ratings.  

## Deploy
Execute these commands from the following directory and export your GCP Project ID to an environment variable.
```
cd apigee-istio-k8s-demo
export GCP_PROJECT=`gcloud config list --format 'value(core.project)' 2>/dev/null
```

1. Build and push the containers to your Google Container Registry.

### Push ratings-nodb
* Push if Docker is installed.
```
docker build src/ratings-nodb --tag ratings-nodb:v6 --build-arg service_version=6
docker tag ratings-nodb:v6 gcr.io/$GCP_PROJECT/ratings-nodb:v6
```

Push the local docker image to [GCR](https://cloud.google.com/container-registry/docs/pushing-and-pulling).
```
docker push gcr.io/$GCP_PROJECT/ratings-nodb:v6
```
* Push if Docker is not installed. Use GCloud instead.  
```
gcloud builds submit --tag gcr.io/$GCP_PROJECT/ratings-nodb:v6 src/ratings-nodb
```

### Push ratings-firestore
* Push if Docker is installed.
```
docker build src/ratings-firestore --tag ratings-firestore:v5 --build-arg service_version=5
docker tag ratings-firestore:v5 gcr.io/$GCP_PROJECT/ratings-firestore:v5
```

Push the local docker image to [GCR](https://cloud.google.com/container-registry/docs/pushing-and-pulling).
```
docker push gcr.io/$GCP_PROJECT/ratings-firestore:v5
```
* Push if Docker is not installed. Use GCloud instead.  
```
gcloud builds submit --tag gcr.io/$GCP_PROJECT/ratings-firestore:v5 src/ratings-firestore
```

2. Deploy the applications to Kubernetes.  These yaml specifications require the containers to be available.  

```
cat kubernetes/ratings-nodb.yaml | sed "s/{{GCP_PROJECT}}/$GCP_PROJECT/g" | kubectl apply -f -
cat kubernetes/ratings-firestore.yaml | sed "s/{{GCP_PROJECT}}/$GCP_PROJECT/g" | kubectl apply -f -
```
