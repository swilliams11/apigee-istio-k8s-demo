# apigee-istio-k8s-demo
This documentation describes the Apigee Istio Adapter as of version 1.1.1.

## TOC
* [Prerequisites](#prerequisites)
* [Getting started with Apigee Istio Adapter](#getting-started-with-apigee-istio-adapater)
* [Resources](#resources)
* [Istio Ingress IP](#istio-ingress-ip)
* [Hello Application Notes](#hello-application-notes)
* [Book Info Application Notes](#book-info-application-notes)
* [Demo Script](#demo-script)
  * [Prep steps](#prep-script)
  * [Ratings - No backend database - v6](#demo-ratings-v6---no-backend-database)
  * [Ratings - Firebase backend - v4](#demo-ratings-firebase)
* [Firestore](#firestore)
* [Ratings API](#ratings-api)
  * [Start Ratings Node.js app locally](#start-ratings-nodejs-app-locally)
* [TODOs](#todos)

## Prerequisites
1. Apigee Edge SaaS account
2. Kubernetes environment
3. Istio installed/enabled in your Kubernetes environment
  * [Installing Istio on existing GKE](https://cloud.google.com/istio/docs/istio-on-gke/installing#adding_istio_on_gke_to_an_existing_cluster)


## Getting Started with Apigee Istio Adapater
Follow the instructions [here](https://docs.apigee.com/api-platform/istio-adapter/installation#installation) to get the Apigee Istio Adapter installed in your environment.  


## Resources
* [Apigee Istio Adapter Github repo](https://github.com/apigee/istio-mixer-adapter)
* [Istio Samples Github repo](https://github.com/istio/istio/tree/master/samples)
* [Apigee Istio Adapater Releases](https://github.com/apigee/istio-mixer-adapter/releases)

## Istio Ingress IP
Get the Istio Ingress host IP
```
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
export SECURE_INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="https")].port}')
```

Set your Gateway IP as shown below.
```
export GATEWAY_URL=$INGRESS_HOST:$INGRESS_PORT
```


## Hello Application Notes
1. Hello command without an API key

```
curl http://${GATEWAY_URL}/hello
```

Response
```
PERMISSION_DENIED:apigee-handler.handler.istio-system:missing authentication
```


2. Hello command with an API Key.
```
curl http://${GATEWAY_URL}/hello -H "x-api-key: {your consumer key}"
```

Response
```
Hello version: v1, instance: helloworld-v1-c64bc46f5-g974q
```


## Book Info Application Notes
The problem is that the `Rule` for the Apigee Adapter is to route all inbound requests to the Apigee Adapter and I need to limit it to just `/hello` or the `helloworld` service for now.  I can't access my `bookinfo` application.

1. After I enabled the Apigee Istio Adapter and attempted to implement the [Istio Book Info demo](https://istio.io/docs/examples/bookinfo/) I received the following error message below.

Now open your browser to:
```
http://IP/productpage
```

This is the error message that I received.
```
PERMISSION_DENIED:apigee-handler.handler.istio-system:missing authentication
```

2. Updated the `Rule` as shown below.

The rule is located in the `samples/apigee` folder in a file named `rule.yaml`.  This folder is in the zip file that you download from the [Apigee Istio Adapter Releases](https://github.com/apigee/istio-mixer-adapter/releases).

```
match: context.reporter.kind == "inbound" && destination.namespace == "default"
```
to
```
match: context.reporter.kind == "inbound" && destination.namespace == "default" && destination.service.name == "helloworld"
```

You can see the service names that are running by executing the following command.
```
kubectl get services
```

Previous attempt.
```
match: context.reporter.kind == "inbound" && destination.namespace == "default" && request.url_path.matches("*/hello") 	
```

3. Reapply the rule
```
 kubectl apply -f samples/apigee/rule.yaml
```

Tested the service from the browser and I can see the book info page.  


## Demo Script

### Prep script
**Note you can skip to the demo section if this is the first time you walk through this.**

Execute these steps if you have already gone through the demo.

1. Delete the `auth-spec`, which enables JWT.  This will allow you to send requests to the service with the `x-api-key` header instead of the `Authorization: Bearer` header (JWT).
```
kubectl delete policy auth-spec
```

2. To disable the Apigee Adapter so that requests are not protected via Apigee then execute then update `samples/apigee/rule.yaml` file with the following line.  This creates a rule to skip the adapater if the service name is `ratings-v6`.  

**Note the samples folder is installed when you install the [Apigee Istio Adapter](https://github.com/apigee/istio-mixer-adapter/releases).**

```
match: context.reporter.kind == "inbound" && destination.namespace == "default" && destination.service.name != "ratings-v6"
```

Apply the change
```
kubectl apply -f samples/apigee/rule.yaml
```

### Demo Ratings-v6 - No backend database
1. Setup terminal

View the current `kubectl` config.
```
kubectl config current-context
```

Set your GCP project and zone.
```
gcloud config set project [PROJECT_ID]
gcloud config set compute/zone us-central1-a
```

Set the credentials for your K8S cluster.
```
gcloud container clusters get-credentials [CLUSTER_NAME]
```

2. Push the container to your Google Cloud Container Registry.
```
cd apigee-istio-k8s-demo/src/ratings-v6
docker build . --tag ratings:v6 --build-arg service_version=6
docker tag ratings:v4 gcr.io/$GOOGLE_CLOUD_PROJECT/ratings:v6
```

Push the local docker image to [GCR](https://cloud.google.com/container-registry/docs/pushing-and-pulling).
```
docker push gcr.io/$GOOGLE_CLOUD_PROJECT/ratings:v6
```

3. Deploy ratings-v6 API to Kubernetes so that it is publicly accessible.

**Note: make sure to update the ratings-v6.yaml file so that it points to your GCP project.**
```
  image: gcr.io/YOUR_GCP_PROJECT_NAME_GOES_HERE/ratings:v6
```

```
cd apigee-istio-k8s-demo/kubernetes
kubectl apply -f ratings-v6.yaml
```

```
kubectl get services
```

You should see the ratings service listed.

```
NAME                TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
edge-microgateway   NodePort                    <none>        8000:31197/TCP   113d
helloworld          NodePort    10              <none>        8081:31402/TCP   113d
kubernetes          ClusterIP   10              <none>        443/TCP          115d
ratings             ClusterIP   10              <none>        9080/TCP         1m
```

```
kubectl get pods
```


4. Istio is already installed and the Apigee Adapter is already installed/enabled in my environment. Create the Apigee product, app and developer and obtain the API Key.

[Configure the Apigee adapter](https://docs.apigee.com/api-platform/istio-adapter/install-istio_1_1#configure_the_apigee_adapter)
[Create the developer, product and app](https://docs.apigee.com/api-platform/istio-adapter/reference#binding_commands).


You can also bind the service to the product with the following [bind command](https://docs.apigee.com/api-platform/istio-adapter/reference#binding_commands).
```
apigee-istio bindings add [service_name] [product_name]  -o [organization] -e [environment] -u [username] -p [password]
```

* Add a path to the `istio-ratings` product to show how you can control the product paths via the Apigee product.
  * add `/ratings/*` to the product paths and then send requests for `/health` and `/ratings` and you should receive an authorization error.

5. See the [operations guide](https://docs.apigee.com/api-platform/istio-adapter/operation) for additional tasks that can be performed.

* Access Token Validation (JWTs)
  * [Istio Authentication Policy](https://istio.io/docs/tasks/security/authn-policy/#end-user-authentication)
* Validate claims within JWT
* Masking analytics data


### Demo Ratings Firebase

#### Prerequisite
Enable the service mesh to allow communication with third-party services.

```
cd apigee-istio-k8s-demo
kubectl apply -f kubernetes/service_entry/service-entry.yaml
```

#### Demo
1. Setup terminal

View the current `kubectl` config.
```
kubectl config current-context
```

Set your GCP project and zone.
```
gcloud config set project [PROJECT_ID]
gcloud config set compute/zone us-central1-a
```

Set the credentials for your K8S cluster.
```
gcloud container clusters get-credentials [CLUSTER_NAME]
```

2. Create the secret in Kubernetes for the Google Firebase JSON file. The secret is named `firebase` and the key is `firebase.json`.
```
cd apigee-istio-k8s-demo
kubectl create secret generic firebase --from-file=keys/firebase.json
```

Confirm that the secret was created.
```
kubectl get secrets
kubectl describe secrets/firebase
kubectl get secret firebase -o yaml
```

3. Push the container to your Google Cloud Container Registry.
```
cd apigee-istio-k8s-demo/src/ratings
docker build . --tag ratings:v4 --build-arg service_version=4
docker tag ratings:v4 gcr.io/$GOOGLE_CLOUD_PROJECT/ratings:v4
```

Push the local docker image to [GCR](https://cloud.google.com/container-registry/docs/pushing-and-pulling).
```
docker push gcr.io/$GOOGLE_CLOUD_PROJECT_NAME_GOES_HERE/ratings:v4
```

4. Deploy ratings API to Kubernetes so that it is publicly accessible.

Deploy Ratings V4 to K8S.
```
cd ../../kubernetes
kubectl apply -f ratings-v4.yaml
```

```
kubectl get services
```

You should see the ratings service listed.

```
NAME                TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
edge-microgateway   NodePort                    <none>        8000:31197/TCP   113d
helloworld          NodePort    10              <none>        8081:31402/TCP   113d
kubernetes          ClusterIP   10              <none>        443/TCP          115d
ratings             ClusterIP   10              <none>        9080/TCP         1m
```

```
kubectl get pods
```

5. Istio is already installed and the Apigee Adapter is already installed/enabled in my environment. Create the Apigee product, app and developer and obtain the API Key.

[Configure the Apigee adapter](https://docs.apigee.com/api-platform/istio-adapter/install-istio_1_1#configure_the_apigee_adapter)
[Create the developer, product and app](https://docs.apigee.com/api-platform/istio-adapter/reference#binding_commands).


You can also bind the service to the product with the following [bind command](https://docs.apigee.com/api-platform/istio-adapter/reference#binding_commands).
```
apigee-istio bindings add [service_name] [product_name]  -o [organization] -e [environment] -u [username] -p [password]
```

* Add a path to the `istio-ratings` product to show how you can control the product paths via the Apigee product.
  * add `/ratings/*` to the product paths and then send requests for `/health` and `/ratings` and you should receive an authorization error.

6. See the [operations guide](https://docs.apigee.com/api-platform/istio-adapter/operation) for additional tasks that can be performed.

* Access Token Validation (JWTs)
  * [Istio Authentication Policy](https://istio.io/docs/tasks/security/authn-policy/#end-user-authentication)
* Validate claims within JWT
* Masking analytics data

## Firestore
This rating app uses Firestore as the backend database.

* Setup credentials for Firestore in location where Node.js will be executed.
https://cloud.google.com/docs/authentication/getting-started#auth-cloud-implicit-nodejs


## Ratings API
**Note that originally this app was supposed to be backed by the Firestore DB, but there is an error on start-up, therefore use version 6, which does not have a database associated to it.**

### Start Ratings Node.js app locally

To start
```
export export GOOGLE_APPLICATION_CREDENTIALS="[PATH_TO_YOUR_FIREBASE_JSON_CREDENDTIAL]"
cd ~/Github/apigee-istio-k8s-demo/src/ratings
node ratings.js 9000
```

### Get all ratings
```
curl http://localhost:9000/ratings
```

Response
```
{"entities":[{"reviewId":1,"rating":5},{"rating":4,"reviewId":2},{"reviewId":"3","productId":"1","rating":"5"},{"reviewId":"3","productId":"1","rating":"5"},{"productId":"1","rating":"5","reviewId":"3"},{"productId":"1","rating":"5","reviewId":"3"},{"reviewId":"3","productId":"2","rating":"5"},{"reviewId":"3","productId":"1","rating":"5"}]}
```
### Get a rating

```
curl http://localhost:9000/ratings/1
```
### Query ratings based on a product ID
```
curl http://localhost:9000/ratings?docId=2
```

Response
```
{"entities":[{"reviewId":"3","productId":"2","rating":"5"}]}
```

### Post a rating

```
curl -X POST http://localhost:9000/ratings -d '{ "reviewId": 3, "rating": 5, "productId": 1 }' -v
```

### Build Docker image and push to Google Container Registry
1. [Build a docker file](https://docs.docker.com/engine/reference/commandline/build/).

```
cd src/ratings
docker build . --tag ratings:v4 --build-arg service_version=4
docker tag ratings:v4 gcr.io/apigee-istio-k8s-sw/ratings:v4
```

2. Push the local docker image to [GCR](https://cloud.google.com/container-registry/docs/pushing-and-pulling).
```
docker push gcr.io/apigee-istio-k8s-sw/ratings:v4
```

### Ratings API v5 (mongo_db)
Ratings API v5 uses MongoDB, but this also generates an error or start-up and needs to be resolved.

### Ratings API v6 (No database)
This version of the Ratings app does not have a database attached to it.  I created this new revision to use for the demo until I resolve the MongoDB and Firestore errors in the other versions.  

## Troubleshooting

SSH into a pod and container.
```
kubectl exec -it ratings-v4-xyz -- /bin/bash
```


Tail the logs
```
kubectl logs ratings-v4-xyz ratings -f
```


### apigee.handler.istio-system:missing authentication error
The reason I received this error is because my authentication-policy had what is shown below, which is the name of the [VirtualService](https://istio.io/docs/reference/config/networking/v1alpha3/virtual-service/).
```
spec:
  targets:
  - name: ratings-api
```
instead of the following which is the name of my [Service](https://kubernetes.io/docs/concepts/services-networking/service/)
```
spec:
  targets:
  - name: ratings-v6
```


### Enabled Debugging on Apigee Istio Adapter
[Debug](https://github.com/apigee/istio-mixer-adapter/wiki/Mixer-logging-and-metrics#policy-mixer)


## TODOs
* Resolve ratings v5 (mongodb) startup error
* Resolve ratings v4 (Firebase) errors
