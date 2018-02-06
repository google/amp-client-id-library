**NOTE: The library below is intended to be used in conjuction with the yet-to-be-released AMP Client ID API for custom integrations. Code and JavaScript libraries below aren't useful yet. If you want to use the AMP Client ID API in conjuction with Google Analytics, please consult the [documentation for the AMP Client ID API in Google Analytics](https://support.google.com/analytics/answer/7486764).**

# Google AMP Client ID Library

This Google AMP Client ID library provides a script that you can use to integrate the [Google AMP Client ID API](https://developers.google.com/amp/client-id/) in your non-AMP pages for custom analytic systems (i.e., for in-house analytics tracking or for analytics vendors that are not [preconfigured for use with the API](https://developers.google.com/amp/client-id/vendor). The Google AMP Client ID API provides you with the ability to consistently track users across AMP and non-AMP pages.

You can learn more about the API and how to customize your analytics systems in the [Google AMP Client ID API documentation](https://developers.google.com/amp/client-id/).


## Usage

Choose one of the following options to integrate the Google AMP Client ID Library in your non-AMP pages:

#### Option 1: Use the compiled binary served on Google CDN (preferred)

1.  Add the following `<script>` tag in your HTML `<head>` section:

    ```html
    <script async src="https://ampcid.google.com/client/v1.js"></script>
    ```
2.  In your JavaScript code, wait for the library load, then call the `getScopedCid` method:

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

#### Option 2: Copy the code into your own project

The recommended integration of the Google AMP Client ID library is to use binary that is served from CDN (option 1),  which saves you from any future version updates. However, if you prefer not to load the extra binary, you can compile the code into your own project.


## Specification

#### Methods

`getScopedCid(scope, apiKey, callback)`: Returns the scoped client ID.

- Parameters:
  - `scope`: The scope of the client ID, specified as a string. You can get different client IDs for the same user client by applying a different `scope` value. See [Determine your AMP client ID scope](https://developers.google.com/amp/client-id/custom#scope) for further information.
  - `apiKey`: The unique API key for the request, specified as a string.  Apply for an API key via the [Google AMP Client ID API in the Google API Console](https://console.developers.google.com/apis/api/ampcid.googleapis.com/overview).
  - `callback`: A callback function that takes two parameters: `function(err, cid)`.
    - `err`: An `Error` object if there is any error, otherwise `null`.
    - `cid`: The client ID string returned from the server.
- Returns: 
  - `cid`:  A scoped client ID that can be one of the following:
    - A string starting with `amp-` followed by URL safe Base64 characters (for example, `amp-UaFdEOQkTib3XGbPVGAJt0OQV8_1Hpmp8EsQOM5EySjmiK9UCs7yTCt219Fz2gER`.
    - `null`, if the client ID was not found.
    - `undefined`, if an error occurred. An `Error` object is returned in this case.
    - `'$OPT_OUT'`. The client has opted out client ID tracking. 

#### Cookie usage

The  Google AMP Client ID library uses the `AMP_TOKEN` cookie to store information. This cookie serves two purposes:

1. To persist a security token that is received from the API server, which can be used to exchange CID values next time.
2. To act as a lock so that no concurrent requests are being sent.


## Testing

To run tests on the Google AMP Client ID library, perform the following:

```
$ npm install
$ npm run test
```
