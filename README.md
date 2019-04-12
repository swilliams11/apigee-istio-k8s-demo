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
* [Firestore](#firestore)
* [Start Ratings Node.js app locally](#start-ratings-nodejs-app-locally)
* [Ratings API](#ratings-api)

## Prerequisites
1. Apigee Edge SaaS account
2. Kubernetes environment
3. Istio installed/enabled in your Kubernetes environment
  * [Installing Istio on existint GKE] (https://cloud.google.com/istio/docs/istio-on-gke/installing#adding_istio_on_gke_to_an_existing_cluster)


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

The rule is located in the `samples/apigee/grpc` folder in a file named `rule.yaml`.  This folder is in the zip file that you download from the [Apigee Istio Adapter Releases](https://github.com/apigee/istio-mixer-adapter/releases).

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
 kubectl apply -f samples/apigee/grpc/rule.yaml
```

Tested the service from the browser and I can see the book info page.  

###


## Demo Script
todo

## firestore
This rating app uses Firestore as the backend database.

* Setup credentials for Firestore in location where Node.js will be executed.
https://cloud.google.com/docs/authentication/getting-started#auth-cloud-implicit-nodejs


## Start Ratings Node.js app locally

To start
```
export export GOOGLE_APPLICATION_CREDENTIALS="[PATH_TO_YOUR_FIREBASE_JSON_CREDENDTIAL]"
cd ~/Github/apigee-istio-k8s-demo/src/ratings
node ratings.js 9000
```

## Ratings API

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
