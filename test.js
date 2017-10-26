/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var chai = require("chai");
chai.use(require("sinon-chai"));
var expect = chai.expect;
var sinon = require('sinon');

var xhrs = [];
var clock = useFakeTimer(self);
self.XMLHttpRequest = XMLHttpRequest;

function ampCidApiOnload(callback) {
  (self.googleAmpCidApiOnload = self.googleAmpCidApiOnload || []).push(callback);
}

describe('Test cid.js', function() {

  beforeEach(function() {
    self.document = {
      cookie: '',
      referrer: 'https://example.com'
    };
    xhrs = [];
    scopedCidCallbacks = {};
    clock.reset();
  });

  it('Should retrieve CID if no AMP_TOKEN exists', function(done) {
    var callbackSpy = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy);
      expect(xhrs[0].withCredentials).to.be.true;
      expect(xhrs[0].method).to.equal('POST');
      expect(xhrs[0].url).to.equal(
          'https://ampcid.google.com/v1/publisher:getClientId?key=key-123');
      expect(xhrs[0].headers).to.deep.equal({
        'Content-Type': 'text/plain;charset=utf-8',
        'Accept': 'application/json'
      });
      expect(xhrs[0].payload).to.equal(JSON.stringify({
        'originScope': 'scope-abc'
      }));
      simulateXhrResponse({
        securityToken: 'token-12345',
        clientId: 'amp-cid-abc-123'
      });
      expect(getToken()).to.equal('token-12345');
      expect(callbackSpy).to.be.calledWith(null, 'amp-cid-abc-123');
      expect(callbackSpy).to.be.calledOnce;
      done();
    });
  });

  it('Should retrieve CID if AMP_TOKEN exists', function(done) {
    setToken('token-54321');
    var callbackSpy = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy);
      expect(xhrs[0].withCredentials).to.be.true;
      expect(xhrs[0].method).to.equal('POST');
      expect(xhrs[0].url).to.equal(
          'https://ampcid.google.com/v1/publisher:getClientId?key=key-123');
      expect(xhrs[0].payload).to.equal(JSON.stringify({
        'originScope': 'scope-abc',
        'securityToken': 'token-54321'
      }));
      simulateXhrResponse({
        clientId: 'amp-cid-abc-123'
      });
      expect(getToken()).to.equal('token-54321');
      expect(callbackSpy).to.be.calledWith(null, 'amp-cid-abc-123');
      expect(callbackSpy).to.be.calledOnce;
      done();
    });
  });

  it('Should respect API responding alternateUrl if no AMP_TOKEN exists', function(done) {
    var callbackSpy = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy);
      simulateXhrResponse({
        alternateUrl: 'https://ampcid.google.co.uk/v1/publisher:getClientId'
      });
      expect(xhrs[0].withCredentials).to.be.true;
      expect(xhrs[0].method).to.equal('POST');
      expect(xhrs[0].url).to.equal(
          'https://ampcid.google.com/v1/publisher:getClientId?key=key-123');
      expect(xhrs[0].payload).to.equal(JSON.stringify({
        'originScope': 'scope-abc',
      }));
      expect(xhrs).to.have.length(2);
      expect(callbackSpy).to.not.be.called;
      expect(xhrs[1].withCredentials).to.be.true;
      expect(xhrs[1].method).to.equal('POST');
      expect(xhrs[1].url).to.equal(
          'https://ampcid.google.co.uk/v1/publisher:getClientId?key=key-123');
      expect(xhrs[1].payload).to.equal(JSON.stringify({
        'originScope': 'scope-abc',
      }));
      simulateXhrResponse({
        securityToken: 'token-12345',
        clientId: 'amp-cid-abc-4321',
      }, 1);
      expect(getToken()).to.equal('token-12345');
      expect(callbackSpy).to.be.calledOnce;
      expect(callbackSpy).to.be.calledWith(null, 'amp-cid-abc-4321');
      done();
    });
  });

  it('Should respect API responding alternateUrl if AMP_TOKEN exists', function(done) {
    setToken('token-54321');
    var callbackSpy = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy);
      simulateXhrResponse({
        alternateUrl: 'https://ampcid.google.co.uk/v1/publisher:getClientId'
      });
      expect(xhrs[0].withCredentials).to.be.true;
      expect(xhrs[0].method).to.equal('POST');
      expect(xhrs[0].url).to.equal(
          'https://ampcid.google.com/v1/publisher:getClientId?key=key-123');
      expect(xhrs[0].payload).to.equal(JSON.stringify({
        'originScope': 'scope-abc',
        'securityToken': 'token-54321'
      }));
      expect(xhrs).to.have.length(2);
      expect(callbackSpy).to.not.be.called;
      expect(xhrs[1].withCredentials).to.be.true;
      expect(xhrs[1].method).to.equal('POST');
      expect(xhrs[1].url).to.equal(
          'https://ampcid.google.co.uk/v1/publisher:getClientId?key=key-123');
      expect(xhrs[1].payload).to.equal(JSON.stringify({
        'originScope': 'scope-abc',
        'securityToken': 'token-54321'
      }));
      simulateXhrResponse({
        clientId: 'amp-cid-abc-4321'
      }, 1);
      expect(callbackSpy).to.be.calledOnce;
      expect(callbackSpy).to.be.calledWith(null, 'amp-cid-abc-4321');
      done();
    });
  });

  it('Should respect API responding OPT_OUT', function(done) {
    var callbackSpy = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy);
      expect(xhrs).to.have.lengthOf(1);
      simulateXhrResponse({
        optOut: true
      });
      expect(getToken()).to.equal('$OPT_OUT');
      expect(callbackSpy).to.be.calledWith(null, '$OPT_OUT');
      expect(callbackSpy).to.be.calledOnce;
      done();
    });
  });

  it('Should respect API responding NOT_FOUND', function(done) {
    var callbackSpy = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy);
      expect(xhrs).to.have.lengthOf(1);
      simulateXhrResponse({});
      expect(getToken()).to.equal('$NOT_FOUND');
      expect(callbackSpy).to.be.calledWith(null, null);
      expect(callbackSpy).to.be.calledOnce;
      done();
    });
  });

  it('Should not retrieve CID if AMP_TOKEN=OPT_OUT', function(done) {
    setToken('$OPT_OUT');
    var callbackSpy = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy);
      expect(xhrs).to.be.empty;
      expect(getToken()).to.equal('$OPT_OUT');
      expect(callbackSpy).to.be.calledWith(null, '$OPT_OUT');
      expect(callbackSpy).to.be.calledOnce;
      done();
    });
  });

  it('Should not retrieve CID if AMP_TOKEN=NOT_FOUND', function(done) {
    setToken('$NOT_FOUND');
    var callbackSpy = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy);
      expect(xhrs).to.be.empty;
      expect(getToken()).to.equal('$NOT_FOUND');
      expect(callbackSpy).to.be.calledWith(null, null);
      expect(callbackSpy).to.be.calledOnce;
      done();
    });
  });

  it('Should fetch CID if AMP_TOKEN=NOT_FOUND but referrer is proxy origin', function(done) {
    self.document.referrer = 'https://example-com.cdn.ampproject.org/page.html';
    setToken('$NOT_FOUND');
    var callbackSpy = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy);
      expect(xhrs).to.have.lengthOf(1);
      done();
    });
  });

  it('Concurrent requests of the same scope should only fetch once', function(done) {
    var callbackSpy1 = sinon.spy();
    var callbackSpy2 = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy1);
      api.getScopedCid('scope-abc', 'key-123', callbackSpy2);

      simulateXhrResponse({
        securityToken: 'token-12345',
        clientId: 'amp-cid-abc-123'
      });
      expect(xhrs).to.have.lengthOf(1);
      expect(getToken()).to.equal('token-12345');
      expect(callbackSpy1).to.be.calledWith(null, 'amp-cid-abc-123');
      expect(callbackSpy1).to.be.calledOnce;
      expect(callbackSpy2).to.be.calledWith(null, 'amp-cid-abc-123');
      expect(callbackSpy2).to.be.calledOnce;
      done();
    });
  });

  it('Concurrent requests of the same scope should only fetch once', function(done) {
    var callbackSpy1 = sinon.spy();
    var callbackSpy2 = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc', 'key-123', callbackSpy1);
      api.getScopedCid('scope-abc', 'key-123', callbackSpy2);

      simulateXhrResponse({
        securityToken: 'token-12345',
        clientId: 'amp-cid-abc-123'
      });
      expect(xhrs).to.have.lengthOf(1);
      expect(getToken()).to.equal('token-12345');
      expect(callbackSpy1).to.be.calledWith(null, 'amp-cid-abc-123');
      expect(callbackSpy1).to.be.calledOnce;
      expect(callbackSpy2).to.be.calledWith(null, 'amp-cid-abc-123');
      expect(callbackSpy2).to.be.calledOnce;
      done();
    });
  });

  it('Concurrent requests of different scopes should fetch separately', function(done) {
    var callbackSpy1 = sinon.spy();
    var callbackSpy2 = sinon.spy();
    ampCidApiOnload(function(api) {
      api.getScopedCid('scope-abc-1', 'key-123', callbackSpy1);
      api.getScopedCid('scope-abc-2', 'key-123', callbackSpy2);

      simulateXhrResponse({
        securityToken: 'token-12345',
        clientId: 'amp-cid-11111'
      });
      // The 2nd request was blocked by AMP_TOKEN.
      // Tick manually to unblock it after the 1st response.
      clock.tick();
      expect(xhrs).to.be.lengthOf(2);

      simulateXhrResponse({
        clientId: 'amp-cid-22222'
      }, 1);

      expect(callbackSpy1).to.be.calledWith(null, 'amp-cid-11111');
      expect(callbackSpy1).to.be.calledOnce;
      expect(callbackSpy2).to.be.calledWith(null, 'amp-cid-22222');
      expect(callbackSpy2).to.be.calledOnce;
      done();
    });
  });

  function simulateXhrResponse(responseJson, index) {
    var i = index || 0;
    xhrs[i].readyState = 4;
    xhrs[i].status = 200;
    xhrs[i].responseText = JSON.stringify(responseJson);
    xhrs[i].onreadystatechange();
  }

  function getToken() {
    var kv = self.document.cookie.split(';')[0].split('=');
    return (kv[0] === 'AMP_TOKEN') ? decodeURIComponent(kv[1]) : null;
  }

  function setToken(value) {
    self.document.cookie = 'AMP_TOKEN=' + encodeURIComponent(value);
  }
});

// Fake browser timer
function useFakeTimer(win) {
  var idCounter = 0;
  var callbacks = {};
  win.setInterval = function(callback) {
    idCounter++;
    var id = idCounter;
    callbacks[id] = callback;
    callback();
    return id;
  };
  win.clearInterval = function(id) {
    // The id can be undefined because this fake setInterval does not execute
    // callback in the next tick, in which case the ID hasn't been returned.
    if (id === undefined) {
      id = idCounter;
    }
    delete callbacks[id];
  };
  win.setTimeout = function(callback) {};

  return {
    tick: function() {
      for (var key in callbacks) {
        callbacks[key]();
      }
    },
    reset: function() {
      idCounter = 0;
      callbacks = {};
    }
  };
}

// Fake XMLHttpRequest
function XMLHttpRequest() {
  this.withCredentials = false;
  this.headers = {};
  xhrs.push(this);
}

XMLHttpRequest.prototype.open = function(method, url) {
  this.method = method;
  this.url = url;
};

XMLHttpRequest.prototype.send = function(payload) {
  this.payload = payload;
};

XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
  this.headers[name] = value;
};
