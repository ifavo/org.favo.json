var Promise = require('org.favo.promise');

var jsonCacheTimeout = null;
var jsonCache = {};
var jsonCacheInterval = null;

function clearjsonCache() {
	var now = new Date().getTime();
	for ( var i in jsonCache ) {
		if ( jsonCache[i] && jsonCache[i].time < now ) {
			jsonCache[i] = null;
			delete(jsonCache[i]);
		}
	}
}

/**
 * enables/disables a cache
 * @param {Number} timeout timeout in seconds, if set to a positive number, it enables the cache, otherwise it will be disabled
 */
function setCache (timeout) {
	timeout = Number(timeout);
	
	// clear potential previous interval for gc
	if ( jsonCacheInterval ) {
		clearInterval(jsonCacheInterval);
	}

	// enable cache	
	if ( timeout > 0 ) {
		jsonCacheTimeout = Number(timeout) * 1000;
		jsonCacheInterval = setInterval(clearjsonCache, jsonCacheTimeout);
	}
	
	else {
		jsonCacheTimeout = null;
	}

}



/**
 * send a GET request to an online service and parse the results into a json object
 * @param {Object} url
 * @param {Object} param
 * @param {Object} headers
 * @return {Promise}
 */
function getJSON (url, param, headers) {
	return sendRequest("GET", url, param, headers);
}

/**
 * send a POST request to an online service and parse the results into a json object
 * @param {Object} url
 * @param {Object} param
 * @param {Object} headers
 * @return {Promise}
 */
function postJSON (url, param, headers) {
	return sendRequest("POST", url, param, headers);
}

/**
 * send a request to an online service and parse the results into a json object
 * @param {Object} url
 * @param {Object} param
 * @return {Promise}
 */
function sendRequest (method, url, param, headers) {
	var promise = Promise.defer();

	// cache exact api calls
	if ( jsonCacheTimeout ) {
		var jsonParams = JSON.stringify(param);
		var now = new Date().getTime();
		if ( jsonCache[url+jsonParams] && jsonCache[url+jsonParams].time >= now ) {
			Ti.API.log("JSON", "serving from jsonCache");
			try {
				promise.resolve(JSON.parse(jsonCache[url+jsonParams].data));
			}
			catch (e) {
				promise.reject(e);
			}
			return promise;
		}
	}
	
	Ti.API.log("getJSON", url, param);
	var client = Titanium.Network.createHTTPClient();
	client.onload = function () {
		Ti.API.log("JSON", "response received", url);
		try {
			var data = JSON.parse(this.responseText);
			promise.resolve(data);

			// set api cache
			if ( jsonCacheTimeout ) {
				jsonCache[url+jsonParams] = {
					time: (new Date().getTime())+jsonCacheTimeout,
					data: this.responseText
				};
			}
		}
		catch (e) {
			promise.reject(e);
		}
	};

	client.onerror = function (err) {
		Ti.API.log("JSON", "error received", err);
		promise.reject(err);
	};

	
	// GET params get moved into the url (enforced with Titanium SDK 3.3.0)
	if ( method == "GET" && param ) {
		var query = '?';
		for ( var i in param ) {
			query += "&" + i + "=" + encodeURIComponent(param[i]);
		}
		url += query;
		param = null;
	}

	client.open(method, url);

	// set custom headers
	if ( headers ) {
		for ( var i in headers ) {
			if ( headers[i] ) {
				client.setRequestHeader(i, headers[i]);
			}
		}
	}

	client.send(param || null);
	
	return promise;
}

module.exports = {
	get: getJSON,
	post: postJSON,
	setCache: setCache
};