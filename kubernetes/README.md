# Kubernetes

This folder contains the yaml files for deploying the application to your kubernetes environment.  

## Deploy

1. Update the image name in the following files to your GCP project name.
  * mongodb.yaml
  * ratings-mongodb.yaml
  * ratings-v4.yaml

2. Build and push the containers to your Google Container Registry.

```
cd apigee-istio-k8s-demo
./src/push_ratings_db_to_gcr.sh $GOOGLE_CLOUD_PROJECT
```

3. Deploy the application to Kubernetes.  These yaml specifications require the containers are available

```
./deploy_mongodb_ratings.sh $GOOGLE_CLOUD_PROJECT
```
