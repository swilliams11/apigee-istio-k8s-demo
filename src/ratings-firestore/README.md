# ratings-firestore

This sample was copied from the Istio Book-info sample and I modified it to use Firestore.  

## Build

### Google Cloud Build
```
export GCP_PROJECT=`gcloud config list --format 'value(core.project)' 2>/dev/null
gcloud builds submit --tag gcr.io/$GCP_PROJECT/ratings-firestore:v5.1 src/ratings-firestore
```


### Docker Build
```
export GCP_PROJECT=`gcloud config list --format 'value(core.project)' 2>/dev/null
docker build src/ratings-firestore --tag ratings-firestore:v5.1 --build-arg service_version=5.1
docker tag ratings-firestore:v5.1 gcr.io/$GCP_PROJECT/ratings-nodb:v5.1
```

Push the local docker image to [GCR](https://cloud.google.com/container-registry/docs/pushing-and-pulling).
```
docker push gcr.io/$GCP_PROJECT/ratings-firestore:v5.1
