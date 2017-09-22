/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var GOOGLE_API_URL = 'https://ampcid.google.com/v1/publisher:getClientId?key=';
var AMP_TOKEN = 'AMP_TOKEN';

var TokenStatus = {
  RETRIEVING: '$RETRIEVING',
  OPT_OUT: '$OPT_OUT',
  NOT_FOUND: '$NOT_FOUND',
  ERROR: '$ERROR'
};

var TIMEOUT = 30000;
var HOUR = 60 * 60 * 1000;
var DAY = 24 * HOUR;
var YEAR = 365 * DAY;

var PROXY_ORIGIN_URL_REGEX =
    /^https:\/\/([a-zA-Z0-9_-]+\.)?cdn\.ampproject\.org/;

var scopedCidCallbacks = {};

/**
 * Gets scoped CID (client ID).
 *
 * @param {string} scope
 * @param {string} apiKey
 * @param {function} callback
 */
function getScopedCid(scope, apiKey, callback) {
  if (scopedCidCallbacks[scope]) {
    scopedCidCallbacks[scope].push(callback);
    return;
  }
  scopedCidCallbacks[scope] = [callback];
  var cb = wrapCallbacks(scopedCidCallbacks[scope]);
  var token;
  // Block the request if a previous request is on flight
  // Poll every 200ms. Longer interval means longer latency for the 2nd CID.
  poll(200, function () {
    token = getCookie(AMP_TOKEN);
    return token !== TokenStatus.RETRIEVING;
  }, function () {
    // If the page referrer is proxy origin, we force to use API even the
    // token indicates a previous fetch returned nothing
    var forceFetch =
        token === TokenStatus.NOT_FOUND && isReferrerProxyOrigin();

    // Token is in a special state
    if (!forceFetch && isStatusToken(token)) {
      if (token === TokenStatus.OPT_OUT) {
        cb(null, TokenStatus.OPT_OUT);
      } else if (token === TokenStatus.NOT_FOUND) {
        cb(null, null);
      } else if (token === TokenStatus.ERROR) {
        cb(new Error('There was an error in previous request. Try later.'));
      } else {
        cb(new Error('Invalid token state: ' + token));
      }
      return;
    }

    if (!token || isStatusToken(token)) {
      persistToken(TokenStatus.RETRIEVING, TIMEOUT);
    }
    fetchCid(GOOGLE_API_URL + apiKey, scope, token, cb)
  });
}

/**
 * Fetches CID remotely
 *
 * @param {string} url
 * @param {string} scope
 * @param {string=} token
 * @param callback
 */
function fetchCid(url, scope, token, callback) {
  var payload = {'originScope': scope};
  if (token) {
    payload['securityToken'] = token;
  }
  fetchJson(url, payload, TIMEOUT, function (err, res) {
    if (err) {
      persistToken(TokenStatus.ERROR, TIMEOUT);
      callback(err);
    } else if (res['optOut']) {
      persistToken(TokenStatus.OPT_OUT, YEAR);
      callback(null, TokenStatus.OPT_OUT);
    } else if (res['clientId']) {
      persistToken(res['securityToken'], YEAR);
      callback(null, res['clientId']);
    } else {
      persistToken(TokenStatus.NOT_FOUND, HOUR);
      callback(null, null);
    }
  });
}

/**
 * Wraps an array of callback functions, so that all of them are invoked
 * together.
 *
 * @param {Array<function>} callbacks
 * @returns {function}
 */
function wrapCallbacks(callbacks) {
  return function () {
    var args = arguments;
    callbacks.forEach(function (callback) {
      callback.apply(null, args);
    })
  };
}

/**
 * Stores the given token value into a cookie with name of `AMP_TOKEN`.
 *
 * @param {string} tokenValue
 * @param {number} expires
 */
function persistToken(tokenValue, expires) {
  if (tokenValue) {
    setCookie(AMP_TOKEN, tokenValue, Date.now() + expires);
  }
}

/**
 * Checks if the document referrer is proxy origin.
 *
 * @returns {boolean}
 */
function isReferrerProxyOrigin() {
  return PROXY_ORIGIN_URL_REGEX.test(self.document.referrer);
}

/**
 * Returns if the AMP_TOKEN contains a value that indicates a special state.
 *
 * @param {string} token
 * @returns {boolean}
 */
function isStatusToken(token) {
  return !!token && (token[0] === '$');
}

/**
 * Polls with the given time interval until the provided `predicate` is `true`.
 *
 * @param {number} delay
 * @param {function} predicate
 * @param {function} callback
 */
function poll(delay, predicate, callback) {
  var interval = self.setInterval(function () {
    if (predicate()) {
      self.clearInterval(interval);
      callback();
    }
  }, delay);
}

/**
 * Gets cookie value. Returns `null` if not exists.
 *
 * @param {string} name
 * @returns {?string}
 */
function getCookie(name) {
  var cookies = self.document.cookie.split(';');
  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();
    var values = cookie.split('=', 2);
    if (values.length !== 2) {
      continue;
    }
    if (decodeURIComponent(values[0]) === name) {
      return decodeURIComponent(values[1]);
    }
  }
  return null;
}

/**
 * Sets cookie.
 *
 * @param {string} name
 * @param {string} value
 * @param {number} expirationTime
 */
function setCookie(name, value, expirationTime) {
  self.document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) +
      '; path=/; expires=' + new Date(expirationTime).toUTCString();
}

/**
 * Fetch a JSON object from a remote endpoint using a POST XHR request.
 *
 * @param {string} url
 * @param {Object} payload
 * @param {number} timeout
 * @param {function} callback
 */
function fetchJson(url, payload, timeout, callback) {
  var oneTimeCallback = oneTime(callback);
  self.setTimeout(function () {
    oneTimeCallback(new Error('Request timed out'));
  }, timeout);

  var xhr = createPostXhrRequest(url);
  xhr.onreadystatechange = function () {
    if (xhr.readyState < /* STATUS_RECEIVED */ 2) {
      return;
    }
    if (xhr.status < 100 || xhr.status > 599) {
      xhr.onreadystatechange = null;
      oneTimeCallback(new Error('Unknown HTTP status' + xhr.status));
      return;
    }
    if (xhr.readyState === /* COMPLETE */ 4) {
      try {
        var json = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) {
          oneTimeCallback(new Error(json.error ?
              json.error.message : ('Invalid response: ' + xhr.responseText)));
        } else {
          oneTimeCallback(null, json);
        }
      } catch (e) {
        oneTimeCallback(new Error('Invalid response: ' + xhr.responseText));
      }
    }
  };
  xhr.onerror = function () {
    oneTimeCallback(new Error('Network failure'));
  };
  xhr.onabort = function () {
    oneTimeCallback(new Error('Request aborted'));
  };
  xhr.send(JSON.stringify(payload));
}

/**
 * Creates a POST XHR.
 *
 * @param {string} url
 * @returns {XMLHttpRequest|XDomainRequest}
 */
function createPostXhrRequest(url) {
  var xhr = new self.XMLHttpRequest();
  if ('withCredentials' in xhr) {
    xhr.open('POST', url, true);
  } else if (typeof self.XDomainRequest !== 'undefined') {
    // IE-specific object.
    xhr = new self.XDomainRequest();
    xhr.open('POST', url);
  } else {
    throw new Error('CORS is not supported');
  }
  xhr.withCredentials = true;
  xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
  xhr.setRequestHeader('Accept', 'application/json');
  return xhr;
}

/**
 * Wraps a callback so that it will only be invoked once.
 *
 * @param {function} callback
 * @returns {function}
 */
function oneTime(callback) {
  var called = false;
  return function () {
    if (!called) {
      callback.apply(null, arguments);
      called = true;
    }
  }
}


self.GoogleAmpCidApi = {
  getScopedCid: getScopedCid
};

if (Object.prototype.toString.call(self.googleAmpCidApiOnload) === '[object Array]') {
  self.googleAmpCidApiOnload.forEach(function (listener) {
    listener(self.GoogleAmpCidApi);
  });
}

self.googleAmpCidApiOnload = {
  push: function (listener) {
    listener(self.GoogleAmpCidApi);
  }
};