'use strict';
var request = require('request'),
    crypto = require('crypto'),
    querystring = require('querystring');

var Bter = function(apiKey, secret, options) {
  this.url = 'https://bter.com/api/1/private';
  this.publicApiUrl = 'http://data.bter.com/api/1';
  this.timeout = 5000;
  this.apiKey = apiKey;
  this.secret = secret;
  this._strictSSL = true;

  if (typeof options === 'function') {
    this.nonce = options;
  } else if (options) {
    this.nonce = options.nonce;
    this.agent = options.agent;

    if (typeof options.timeout !== 'undefined') {
      this.timeout = options.timeout;
    }
    if (typeof options.tapi_url !== 'undefined') {
      this.url = options.tapi_url;
    }
    if (typeof options.public_url !== 'undefined') {
      this.publicApiUrl = options.public_url;
    }
    if (typeof options.strict_ssl !== 'undefined') {
      this._strictSSL = !!options.strict_ssl;
    }
  }
};

Bter.prototype._sendRequest = function (options, callback) {
  var self = this;
  var requestOptions = {
    timeout: self.timeout,
    agent: self.agent,
    strictSSL: self._strictSSL
  };

  for (var key in options) {
    requestOptions[key] = options[key];
  }

  request(requestOptions, function(err, response, body) {
    if(err || response.statusCode !== 200) {
      return callback(new Error(err || response.statusCode));
    }

    var result;
    try {
      result = JSON.parse(body);
    } catch(error) {
      return callback(error);
    }

    if(result.error) {
      return callback(new Error(result.error));
    }

    return callback(null, result);
  });
};

Bter.prototype.makeRequest = function(method, params, callback) {
  var self = this;

  if(!self.apiKey || !self.secret) {
    return callback(new Error('Must provide API key and secret to use the trade API.'));
  }

  // If the user provided a function for generating the nonce, then use it.
  if(self.nonce) {
    params.nonce = self.nonce();
  } else {
    params.nonce = Math.round((new Date()).getTime() / 1000);
  }

  var formData = {};
  for (var key in params) {
    formData[key] = params[key];
  }

  var form = querystring.stringify(formData);
  var sign = crypto.createHmac('sha512', self.secret).update(new Buffer(form)).digest('hex').toString();

  return self._sendRequest({
    url: self.url + '/' + method,
    method: 'POST',
    form: form,
    headers: {
      SIGN: sign,
      KEY: self.apiKey,
      Content-Type: 'application/x-www-form-urlencoded'
    }
  }, callback);
};

Bter.prototype.makePublicApiRequest = function(method, pair, callback) {
  var p = pair;
  if (p)
  	p = '/' + pair;
  this._sendRequest({
    url: this.publicApiUrl + '/' + method + p
  }, callback);
};


Bter.prototype.getFunds = function(callback) {
  this.makeRequest('getfunds', {}, callback);
};


Bter.prototype.trade = function(pair, type, rate, amount, callback) {
  this.makeRequest('placeorder',  {
    'pair': pair,
    'order_type': type,
    'rate': rate,
    'amount': amount
  }, callback);
};

Bter.prototype.myTrades = function(pair, type, rate, amount, callback) {
  this.makeRequest('mytrades',  {
    'pair': pair
  }, callback);
};

Bter.prototype.cancelOrder = function(order_id, callback) {
  this.makeRequest('cancelorder',{
	  'order_id' : order_id
	  }, callback);
};

Bter.prototype.getOrder = function(order_id, callback) {
  this.makeRequest('getorder',{
	  'order_id' : order_id
	  }, callback);
};

Bter.prototype.orderLink = function(callback) {
  this.makeRequest('orderlist', {}, callback);
};


Bter.prototype.marketInfo = function(callback) {
  this.makePublicApiRequest('marketinfo', '', callback);
};

Bter.prototype.marketList = function(callback) {
  this.makePublicApiRequest('marketlist', '', callback);
};

Bter.prototype.tickers = function(callback) {
  this.makePublicApiRequest('tickers', '', callback);
};

Bter.prototype.ticker = function(pair, callback) {
  this.makePublicApiRequest('ticker', pair, callback);
};

Bter.prototype.depth = function(pair, callback) {
  this.makePublicApiRequest('depth', pair, callback);
};

Bter.prototype.tradeHistory = function(pair, callback) {
  this.makePublicApiRequest('trade', pair, callback);
};


module.exports = Bter;
