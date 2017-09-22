# Google AMP Client ID Library

## Introduction
The AMP Client ID API allows you to uniquely identify a user across your AMP and
non-AMP content. This works by allowing your web pages, which may be partially
served on Google platforms and partially on your domain, to communicate with 
each other via the API.

[LEARN MORE](https://developers.google.com/amp/client-id/)

## Usage

##### Use the compiled binary served on Google CDN
Add the script tag into your HTML header.
```html
 <head>
  ...
  <script async src="https://ampcid.google.com/client/v1.js"></script>
 </head>
```

In your Javascript code, wait for the library load and use it:
```js
function ampCidApiOnload(callback) {
  (self.googleAmpCidApiOnload = self.googleAmpCidApiOnload || []).push(callback);
}

ampCidApiOnload(function(api) {
  api.getScopedCid('scope-abc', 'YOUR_API_KEY', function(err, cid) {
    if (err) {
      alert('Error: ' + err);
    } else {
      alert('Client ID:' + cid);
    }
  });
});
```

##### Copy the code into your own project
Using the binary served from CDN is the recommended way, which saves you from
any future version update.

But if you prefer not to load the extra binary, you can compile the code into 
your own project.

## Specification
#### Methods
##### getScopedCid(scope, apiKey, callback)
- `scope`: The scope of the client ID. You can get different client IDs for the same user client by applying different `scope`.
- `apiKey`: The API key to be used for the request. You can apply for your own API key [here](https://console.developers.google.com/apis/api/ampcid.googleapis.com/overview).
- `callback`: The callback is a function taking 2 params: `function(err, cid)`.
  - `err`: an `Error` object if there is any error, otherwise `null`.
  - `cid`: the client ID string returned from the server.

#### Client ID values
The value of the returned client ID can be one of the following:
- A string starting with `amp-` followed by URL safe Base64 characters. e.g: 
```
amp-UaFdEOQkTib3XGbPVGAJt0OQV8_1Hpmp8EsQOM5EySjmiK9UCs7yTCt219Fz2gER
```
- `null`, if the client ID was not found.
- `undefined`, if an error occurred. An `Error` will be returned in this case.
- `'$OPT_OUT'`. The client has opted out client ID tracking. 

#### Cookie usage
The library uses cookie `AMP_TOKEN` to store information. It serves 2 purposes:
1. To persist a security token received from the API server which is to be used for exchanging CID next time.
2. To act as a lock so that no concurrent requests being sent. 

## Run test
```
$ npm install
$ npm run test

```

## Disclaimer
This is not an official Google product.