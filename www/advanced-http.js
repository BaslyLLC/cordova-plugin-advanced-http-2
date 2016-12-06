/*global angular*/

/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Modified by Andrew Stephan for Sync OnSet
 * Modified by Sefa Ilkimen:
 *  - added configurable params serializer
 *
*/

/*
 * An HTTP Plugin for PhoneGap.
 */

var pluginId = module.id.slice(0, module.id.indexOf('.'));
var validSerializers = ['urlencoded', 'json'];

var exec = require('cordova/exec');
var angularIntegration = require(pluginId +'.angular-integration');
var cookieHandler = require(pluginId + '.cookie-handler');

// Thanks Mozilla: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_.22Unicode_Problem.22
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

function mergeHeaders(globalHeaders, localHeaders) {
    var globalKeys = Object.keys(globalHeaders);
    var key;

    for (var i = 0; i < globalKeys.length; i++) {
        key = globalKeys[i];

        if (!localHeaders.hasOwnProperty(key)) {
            localHeaders[key] = globalHeaders[key];
        }
    }

    return localHeaders;
}

function checkSerializer(serializer) {
    serializer = serializer || '';
    serializer = serializer.trim().toLowerCase();

    if (validSerializers.indexOf(serializer) > -1) {
        return serializer;
    }

    return serializer[0];
}

function resolveCookieString(headers) {
    var keys = Object.keys(headers);

    for (var i = 0; i < keys.length; ++i) {
        if (keys[i].match(/^set-cookie$/i)) {
            return headers[keys[i]];
        }
    }

    return null;
}

function getSuccessHandler(url, cb) {
    return function(response) {
        cookieHandler.setCookie(url, resolveCookieString(response.headers));
        cb(response);
    }
}

function getCookieHeader(url) {
    return { Cookie: cookieHandler.getCookie(url) };
}

var http = {
    headers: {},
    dataSerializer: 'urlencoded',
    sslPinning: false,
    getBasicAuthHeader: function (username, password) {
        return {'Authorization': 'Basic ' + b64EncodeUnicode(username + ':' + password)};
    },
    useBasicAuth: function (username, password) {
        this.headers.Authorization = 'Basic ' + b64EncodeUnicode(username + ':' + password);
    },
    setHeader: function (header, value) {
        this.headers[header] = value;
    },
    setDataSerializer: function (serializer) {
        this.dataSerializer = checkSerializer(serializer);
    },
    clearCookies: function () {
        return cookieHandler.clearCookies();
    },
    enableSSLPinning: function (enable, success, failure) {
        return exec(success, failure, 'CordovaHttpPlugin', 'enableSSLPinning', [enable]);
    },
    acceptAllCerts: function (allow, success, failure) {
        return exec(success, failure, 'CordovaHttpPlugin', 'acceptAllCerts', [allow]);
    },
    validateDomainName: function (validate, success, failure) {
        return exec(success, failure, 'CordovaHttpPlugin', 'validateDomainName', [validate]);
    },
    post: function (url, data, headers, success, failure) {
        data = data || {};
        headers = headers || {};
        headers = mergeHeaders(this.headers, headers);
        headers = mergeHeaders(getCookieHeader(url), headers);

        return exec(getSuccessHandler(url, success), failure, 'CordovaHttpPlugin', 'post', [url, data, this.dataSerializer, headers]);
    },
    get: function (url, params, headers, success, failure) {
        params = params || {};
        headers = headers || {};
        headers = mergeHeaders(this.headers, headers);
        headers = mergeHeaders(getCookieHeader(url), headers);

        return exec(getSuccessHandler(url, success), failure, 'CordovaHttpPlugin', 'get', [url, params, headers]);
    },
    head: function (url, params, headers, success, failure) {
        headers = mergeHeaders(this.headers, headers);
        headers = mergeHeaders(getCookieHeader(url), headers);

        return exec(getSuccessHandler(url, success), failure, 'CordovaHttpPlugin', 'head', [url, params, headers]);
    },
    uploadFile: function (url, params, headers, filePath, name, success, failure) {
        headers = mergeHeaders(this.headers, headers);
        headers = mergeHeaders(getCookieHeader(url), headers);

        return exec(getSuccessHandler(url, success), failure, 'CordovaHttpPlugin', 'uploadFile', [url, params, headers, filePath, name]);
    },
    downloadFile: function (url, params, headers, filePath, success, failure) {
        headers = mergeHeaders(this.headers, headers);
        headers = mergeHeaders(getCookieHeader(url), headers);

        var win = function (result) {
            var entry = new (require('cordova-plugin-file.FileEntry'))();
            entry.isDirectory = false;
            entry.isFile = true;
            entry.name = result.file.name;
            entry.fullPath = result.file.fullPath;
            entry.filesystem = new FileSystem(result.file.filesystemName || (result.file.filesystem == window.PERSISTENT ? 'persistent' : 'temporary'));
            entry.nativeURL = result.file.nativeURL;
            success(entry);
        };

        return exec(win, failure, 'CordovaHttpPlugin', 'downloadFile', [url, params, headers, filePath]);
    }
};

angularIntegration.registerService(http);
module.exports = http;
