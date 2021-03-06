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
  * [Ratings - No backend database](#demo-ratings-nodb---no-backend-database)
  * [Ratings - Firestore backend](#demo-ratings-firestore)
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

2. To disable the Apigee Adapter so that requests are not protected via Apigee, then execute then update `samples/apigee/rule.yaml` file with the following line.  This creates a rule to skip the adapter if the service name is `ratings-nodb`.  

**Note the samples folder is installed when you install the [Apigee Istio Adapter](https://github.com/apigee/istio-mixer-adapter/releases).**

```
match: context.reporter.kind == "inbound" && destination.namespace == "default" && destination.service.name != "ratings-nodb"
```

Apply the change
```
kubectl apply -f samples/apigee/rule.yaml
```

### Demo Setup
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

Export your Google Cloud project ID to an environment variable.
```
export GCP_PROJECT=`gcloud config list --format 'value(core.project)' 2>/dev/null
```

2. Deploy the ratings-ingress gateway.
```
kubectl apply -f kubernetes/ratings-ingress.yaml
```

### Demo ratings-nodb - No backend database
This demo uses the ratings app that does not use a backend database, so all ratings are stored within the local containers memory.
All commands should be executed from the following directory.
```
cd apigee-istio-k8s-demo
```

1. Push the container to your Google Cloud Container Registry.
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

2. Deploy ratings-nodb API to Kubernetes so that it is publicly accessible.
```
cat kubernetes/ratings-nodb.yaml | sed "s/{{GCP_PROJECT}}/$GCP_PROJECT/g" | kubectl apply -f -
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


3. Istio is already installed and the Apigee Adapter is already installed/enabled in my environment. Create the Apigee product, app and developer and obtain the API Key.

[Configure the Apigee adapter](https://docs.apigee.com/api-platform/istio-adapter/install-istio_1_1#configure_the_apigee_adapter)
[Create the developer, product and app](https://docs.apigee.com/api-platform/istio-adapter/reference#binding_commands).


You can also bind the service to the product with the following [bind command](https://docs.apigee.com/api-platform/istio-adapter/reference#binding_commands).
```
apigee-istio bindings add [service_name] [product_name]  -o [organization] -e [environment] -u [username] -p [password]
```

* Add a path to the `istio-ratings` product to show how you can control the product paths via the Apigee product.
  * add `/` to the product path.

4. See the [operations guide](https://docs.apigee.com/api-platform/istio-adapter/operation) for additional tasks that can be performed.

* Access Token Validation (JWTs)
  * [Istio Authentication Policy](https://istio.io/docs/tasks/security/authn-policy/#end-user-authentication)
* Validate claims within JWT
* Masking analytics data

6. Send the following requests.
Sending the ratings request without a `x-api-key` header will return and error.
```
curl http://${GATEWAY_URL}/nodb-ratings/1 -i
```

Response is
```
HTTP/1.1 403 Forbidden
content-length: 76
content-type: text/plain
date: Mon, 23 Sep 2019 20:24:10 GMT
server: envoy
x-envoy-upstream-service-time: 11

PERMISSION_DENIED:apigee-handler.handler.istio-system:missing authentication
```

Send the request with the `x-api-key` header and you will receive a 200 OK response.
```
curl http://${GATEWAY_URL}/nodb-ratings/1 -H "x-api-key: YOUR_APIKEY_HERE" -i
```
The response is:
```
HTTP/1.1 200 OK
content-type: application/json
date: Mon, 23 Sep 2019 20:19:31 GMT
x-envoy-upstream-service-time: 1142
server: envoy
transfer-encoding: chunked

{"rating":5,"reviewId":1}
```


#### Additional requests
Fetch specific rating.
```
curl http://${GATEWAY_URL}/nodb-ratings/2 -H "x-api-key: YOUR_APIKEY_HERE" -i
curl http://${GATEWAY_URL}/nodb-ratings?docId=2 -H "x-api-key: YOUR_APIKEY_HERE" -i
```

Post a new rating.  
```
curl -X POST http://${GATEWAY_URL}/v6/ratings -H "x-api-key: YOUR_APIKEY_HERE" -d '{ "reviewId": 3, "rating": 5, "productId": 1 }' -i
```

Health check.
```
curl http://${GATEWAY_URL}/nodb-ratings/health -H "x-api-key: YOUR_APIKEY_HERE"
```

### Demo Ratings Firestore
In this demo we use the Istio VirtualService gateway to rewrite expose a different base path (`/firestore-ratings`) and rewrite that base path to `/ratings`.  We still need to include the actual path that is used in the Apigee product (`/`) to expose the service to developers.    

#### Prerequisites
Enable the service mesh to allow communication with third-party services.  Review the Istio documentation to [access an external HTTPS service.](https://istio.io/docs/tasks/traffic-management/egress/egress-control/#access-an-external-https-service)

```
cd apigee-istio-k8s-demo
kubectl apply -f kubernetes/service_entry/firestore-egress.yaml
```

#### Demo
1. Create the secret in Kubernetes for the Google Firestore JSON file. The secret is named `firestore` and the key is `firestore.json`.
```
cd apigee-istio-k8s-demo
kubectl create secret generic firestore --from-file=keys/firestore.json
```

Confirm that the secret was created.
```
kubectl get secrets
kubectl describe secrets/firebase
kubectl get secret firebase -o yaml
```

2. Push the container to your Google Cloud Container Registry.
* Use the following commands if Docker is installed.
```
docker build src/ratings-firestore --tag ratings-firestore:v5.1 --build-arg service_version=5.1
docker tag ratings-firestore:v5 gcr.io/$GCP_PROJECT/ratings-firestore:v5.1
```

Push the local docker image to [GCR](https://cloud.google.com/container-registry/docs/pushing-and-pulling).
```
docker push gcr.io/$GCP_PROJECT/ratings-firestore:v5.1
```

* Use the following commands if Docker **is not** installed.
```
gcloud builds submit --tag gcr.io/$GCP_PROJECT/ratings-firestore:v5.1 src/ratings-firestore
```

3. Deploy ratings API to Kubernetes so that it is publicly accessible.

Deploy ratings-firestore V5 to K8S.
```
cat kubernetes/ratings-firestore.yaml | sed "s/{{GCP_PROJECT}}/$GCP_PROJECT/g" | kubectl apply -f -
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
ratings-firestore   ClusterIP   10              <none>        9080/TCP         1m
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

* Add a path to the `istio-ratings-firestore` product to show how you can control the product paths via the Apigee product.
  * add `/ratings/*` to the product paths and then send requests for `/health` and `/ratings` and you should receive an authorization error.
  * **Note**: The `firestore-ingress.yaml` rewrites the uri path from `/firestore-ratings` to `/ratings`; therefore, you need to configure the Apigee product paths as `/ratings` and `/ratings/*`.

5. See the [operations guide](https://docs.apigee.com/api-platform/istio-adapter/operation) for additional tasks that can be performed.

* Access Token Validation (JWTs)
  * [Istio Authentication Policy](https://istio.io/docs/tasks/security/authn-policy/#end-user-authentication)
* Validate claims within JWT
* Masking analytics data

6. Send the following requests.
Sending the ratings request without a `x-api-key` header will return and error.
```
curl http://${GATEWAY_URL}/firestore-ratings -i
```
**Note**: The `firestore-ingress.yaml` rewrites the uri path from `/firestore-ratings` to `/ratings`.

Response is
```
HTTP/1.1 403 Forbidden
content-length: 76
content-type: text/plain
date: Mon, 23 Sep 2019 20:24:10 GMT
server: envoy
x-envoy-upstream-service-time: 11

PERMISSION_DENIED:apigee-handler.handler.istio-system:missing authentication
```

Send the request with the `x-api-key` header and you will receive a 200 OK response.
```
curl http://${GATEWAY_URL}/firestore-ratings -H "x-api-key: YOUR_APIKEY_HERE" -i
```
The response is:
```
HTTP/1.1 200 OK
content-type: application/json
date: Mon, 23 Sep 2019 20:19:31 GMT
x-envoy-upstream-service-time: 1142
server: envoy
transfer-encoding: chunked

{"entities":[{"rating":5,"reviewId":1},{"rating":4,"reviewId":2},{"rating":"5","reviewId":"3","productId":"1"},{"reviewId":"3","productId":"1","rating":"5"},{"productId":"1","rating":"5","reviewId":"3"},{"reviewId":"3","productId":"1","rating":"5"},{"productId":"2","rating":"5","reviewId":"3"},{"rating":"5","reviewId":"3","productId":"1"}]}
```


##### Additional requests
Fetch specific rating.
```
curl http://${GATEWAY_URL}/firestore-ratings/1 -H "x-api-key: YOUR_APIKEY_HERE" -i
curl http://${GATEWAY_URL}/firestore-ratings?docId=2 -H "x-api-key: YOUR_APIKEY_HERE" -i
```

Post a new rating.  
```
curl -X POST http://${GATEWAY_URL}/firestore-ratings -H "x-api-key: YOUR_APIKEY_HERE" -d '{ "reviewId": 3, "rating": 5, "productId": 1 }' -i
```

## Firestore
This rating app uses Firestore as the backend database.

* Setup credentials for Firestore in location where Node.js will be executed.
https://cloud.google.com/docs/authentication/getting-started#auth-cloud-implicit-nodejs


## Ratings API
### Start ratings-firestore Node.js app locally

To start
```
export GOOGLE_APPLICATION_CREDENTIALS="[PATH_TO_YOUR_FIREBASE_JSON_CREDENDTIAL]"
cd ~/Github/apigee-istio-k8s-demo/src/ratings-firestore
node ratings.js 9000
```

#### Get all ratings
```
curl http://localhost:9000/ratings
```

Response
```
{"entities":[{"reviewId":1,"rating":5},{"rating":4,"reviewId":2},{"reviewId":"3","productId":"1","rating":"5"},{"reviewId":"3","productId":"1","rating":"5"},{"productId":"1","rating":"5","reviewId":"3"},{"productId":"1","rating":"5","reviewId":"3"},{"reviewId":"3","productId":"2","rating":"5"},{"reviewId":"3","productId":"1","rating":"5"}]}
```
#### Get a rating

```
curl http://localhost:9000/ratings/1
```
#### Query ratings based on a product ID
```
curl http://localhost:9000/ratings?docId=2
```

Response
```
{"entities":[{"reviewId":"3","productId":"2","rating":"5"}]}
```

#### Post a rating

```
curl -X POST http://localhost:9000/ratings -d '{ "reviewId": 3, "rating": 5, "productId": 1 }' -v
```
#### Health check
```
curl -X POST http://localhost:9000/ratings/v6/health -i
```

### Start ratings-nodb Node.js app locally

To start
```
export GOOGLE_APPLICATION_CREDENTIALS="[PATH_TO_YOUR_FIREBASE_JSON_CREDENDTIAL]"
cd ~/Github/apigee-istio-k8s-demo/src/ratings-nodb
node ratings.js 9000
```

#### Get a rating

```
curl http://localhost:9000/ratings/
```
#### Query ratings based on a product ID
```
curl http://localhost:9000/ratings?docId=2
```

Response
```
{"entities":[{"reviewId":"3","productId":"2","rating":"5"}]}
```

#### Post a rating

```
curl -X POST http://localhost:9000/ratings -d '{ "reviewId": 3, "rating": 5, "productId": 1 }' -v
```

#### Health check
```
curl -X POST http://localhost:9000/ratings/health -i
```

## Misc
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
  - name: ratings-nodb
```


### Enabled Debugging on Apigee Istio Adapter
[Debug](https://github.com/apigee/istio-mixer-adapter/wiki/Mixer-logging-and-metrics#policy-mixer)


## TODOs
* Resolve ratings v5 (mongodb) startup error
* Resolve ratings v4 (Firebase) errors
