// Copyright 2017 Istio Authors
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

const Firestore = require('@google-cloud/firestore');
const firestore = new Firestore();
var http = require('http')
var dispatcher = require('httpdispatcher')
var port = parseInt(process.argv[2])

console.log(process.env.DB_TYPE);
console.log('firestore is enabled!');
async function initializeFirestoreWithData() {

  var document = firestore.doc('ratings/1');
  console.log('Document created');

  // Enter new data into the document.
  await document.set({
    reviewId: 1,
    rating: 5,
  });
  console.log('Entered new data into the document');

  document = firestore.doc('ratings/2');
  await document.set({
    reviewId: 2,
    rating: 4,
  });
}
//initializeFirestoreWithData();


/*
health check
*/
dispatcher.onGet('/ratings/health', function (req, res) {
  res.writeHead(200, {'Content-type': 'application/json'})
  res.end(JSON.stringify({status: 'Ratings is healthy'}))
});

/*
Creates a new rating in the Ratings collection without a provided id.
*/
dispatcher.onPost(/^\/ratings/, function (req, res) {
  var ratings = {}
/*
  if (Number.isNaN(ratingId)) {
    res.writeHead(400, {'Content-type': 'application/json'})
    res.end(JSON.stringify({error: 'please provide numeric product ID'}))
    return
  }
*/
  ratings = parseJson(req);
  if(ratings != null){
    createFirestoreDocumentNoDocId(ratings, res);
  }
});

/*
Creates a new rating in the Ratings collection.
*/
dispatcher.onPost(/^\/ratings\/[0-9]*/, function (req, res) {
  var ratingIdStr = req.url.split('/').pop()
  var ratingId = parseInt(ratingIdStr)
  var ratings = {}

  if (Number.isNaN(ratingId)) {
    res.writeHead(400, {'Content-type': 'application/json'})
    res.end(JSON.stringify({error: 'please provide numeric product ID'}))
    return
  }

  ratings = parseJson(res);
  if(ratings != null){
    createFirestoreDocument(ratingIdStr, ratings, res)
  }
});

function parseJson(req){
  try {
    console.log(req.body);
    ratings = JSON.parse(req.body)
    return ratings;
  } catch (error) {
    res.writeHead(400, {'Content-type': 'application/json'})
    res.end(JSON.stringify({error: 'please provide valid ratings JSON'}))
    return
  }
}

/*
Create a new document in Firestore with the document id provide in the request.
@ratingId - number
@json - payload
returns void
*/
async function createFirestoreDocument(ratingId, json, res){
  var documentRef;
  var jsonString = JSON.stringify(json);
  documentRef = firestore.doc('ratings/' + ratingId);
  await documentRef.set(json)
    .then(firestoreRes => {
      res.writeHead(200, {'Content-type': 'application/json', 'Location': 'ratings/' + firestoreRes.id})
      res.end(jsonString)
      console.log('Entered new data into the document');
  });
}

/*
Create a new document in Firestore and let Firestore create the document Id.
*/
async function createFirestoreDocumentNoDocId(json, res){
  var documentRef;
  var jsonString = JSON.stringify(json);

  console.log(json);
  await firestore.collection('ratings').add(json)
    .then(ref => {
      res.writeHead(200, {'Content-type': 'application/json', 'Location': 'ratings/' + ref.id})
      res.end(jsonString)
      console.log('Added document with ID: ', ref.id);
  });
}

/*
* Get a rating by rating id
*/
dispatcher.onGet(/^\/ratings\/[0-9]*/, function (req, res) {
  var ratingIdStr = req.url.split('/').pop()
  var ratingId = parseInt(ratingIdStr)

  if (Number.isNaN(ratingId)) {
    res.writeHead(400, {'Content-type': 'application/json'})
    res.end(JSON.stringify({error: 'please provide numeric rating ID'}))
  } else {
    var firstRating = 0
    var secondRating = 0

      async function fetchRating() {
        const documentRef = firestore.doc('ratings/' + ratingIdStr);
        console.log('fetching document');
        var data;
        // Read the document.
        await documentRef.get().then((documentSnapshot) => {
          if (documentSnapshot.exists) {
            data = `${JSON.stringify(documentSnapshot.data())}`
            console.log('Data: ' + data);
            res.writeHead(200, {'Content-type': 'application/json'});
            res.end(data);
          }
        }).catch(err => {
          console.log('Error in fetchRating()', err);
          res.writeHead(500, {'Content-type': 'application/json'});
          res.end(err);
        });;
      }
    fetchRating();

  }
})

/*
* Get a ratings with query param
*/
dispatcher.onGet(/\/ratings.*/, function (req, res) {
  var docIdParam = req.url.split('?').pop();
  var docId = docIdParam.split('=');
  console.log(docId[1]);
  if(req.url.includes('?')){
    fetchRatingWithQueryParam(docId[1], res);
  } else {
    fetchAllRatings(res);
  }
});


/*
Fetch all ratings
*/
async function fetchAllRatings(res) {
  const ratingsCollection = firestore.collection('ratings');
  console.log('fetching all documents');
  // Read the documents
  await ratingsCollection.get()
    .then(snapshot => {
      //if (snapshot.exists) {
        var entities = [];
        var payload = {};
        snapshot.forEach( doc => {
          data = JSON.stringify(doc.data());
          console.log('Data: ' + data);
          entities.push(doc.data());
        });
        payload["entities"] = entities;
        res.writeHead(200, {'Content-type': 'application/json'});
        res.end(JSON.stringify(payload));
      //} else {
      //  console.log('snapshot does not exist.');
      //}
    }).catch(err => {
      console.log('Error getting documents', err);
      res.writeHead(500, {'Content-type': 'application/json'});
      res.end(err);
    });
}

/*
Fetch the ratings based on the product ID;
*/
async function fetchRatingWithQueryParam(docId, res) {
  const documentRef = firestore.collection('ratings');
  console.log('fetching documents with query param');
  var ratingsQuery = documentRef.where('productId', '=', docId );

  await ratingsQuery.get()
    .then(querySnapshot => {
      var entities = [];
      var payload = {};
      querySnapshot.forEach(documentSnapshot => {
        var data = `${JSON.stringify(documentSnapshot.data())}`
        console.log('Data: ' + data);
        entities.push(documentSnapshot.data());
    });
    payload.entities = entities;
    res.writeHead(200, {'Content-type': 'application/json'});
    res.end(JSON.stringify(payload));

  }).catch(err => {
    console.log('Error getting documents by query param', err);
    res.writeHead(500, {'Content-type': 'application/json'});
    res.end(err);
  });
}

function handleRequest (request, response) {
  try {
    console.log(request.method + ' ' + request.url)
    dispatcher.dispatch(request, response)
  } catch (err) {
    console.log(err)
  }
}

var server = http.createServer(handleRequest)

server.listen(port, function () {
  console.log('Server listening on: http://0.0.0.0:%s', port)
})
