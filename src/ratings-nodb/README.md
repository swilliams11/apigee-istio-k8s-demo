# ratings-nodb

This sample was copied from the Istio Book-info sample and I modified it so that it does not use any databases.  

### Google Cloud Build
```
export GCP_PROJECT=`gcloud config list --format 'value(core.project)' 2>/dev/null
gcloud builds submit --tag gcr.io/$GCP_PROJECT/ratings-nodb:v6 src/ratings-firestore
```


### Docker Build
```
export GCP_PROJECT=`gcloud config list --format 'value(core.project)' 2>/dev/null
docker build src/ratings-nodb --tag ratings-nodb:v6 --build-arg service_version=6
docker tag ratings-nodb:v6 gcr.io/$GCP_PROJECT/ratings-nodb:v6
```

Push the local docker image to [GCR](https://cloud.google.com/container-registry/docs/pushing-and-pulling).
```
docker push gcr.io/$GCP_PROJECT/ratings-nodb:v6
