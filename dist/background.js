(function () {
    'use strict';

    const getDefaultsFromPostinstall = () => (undefined);

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const stringToByteArray$1 = function (str) {
        // TODO(user): Use native implementations if/when available
        const out = [];
        let p = 0;
        for (let i = 0; i < str.length; i++) {
            let c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            }
            else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            }
            else if ((c & 0xfc00) === 0xd800 &&
                i + 1 < str.length &&
                (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
                // Surrogate Pair
                c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
            else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };
    /**
     * Turns an array of numbers into the string given by the concatenation of the
     * characters to which the numbers correspond.
     * @param bytes Array of numbers representing characters.
     * @return Stringification of the array.
     */
    const byteArrayToString = function (bytes) {
        // TODO(user): Use native implementations if/when available
        const out = [];
        let pos = 0, c = 0;
        while (pos < bytes.length) {
            const c1 = bytes[pos++];
            if (c1 < 128) {
                out[c++] = String.fromCharCode(c1);
            }
            else if (c1 > 191 && c1 < 224) {
                const c2 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            }
            else if (c1 > 239 && c1 < 365) {
                // Surrogate Pair
                const c2 = bytes[pos++];
                const c3 = bytes[pos++];
                const c4 = bytes[pos++];
                const u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
                    0x10000;
                out[c++] = String.fromCharCode(0xd800 + (u >> 10));
                out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
            }
            else {
                const c2 = bytes[pos++];
                const c3 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            }
        }
        return out.join('');
    };
    // We define it as an object literal instead of a class because a class compiled down to es5 can't
    // be treeshaked. https://github.com/rollup/rollup/issues/1691
    // Static lookup maps, lazily populated by init_()
    // TODO(dlarocque): Define this as a class, since we no longer target ES5.
    const base64 = {
        /**
         * Maps bytes to characters.
         */
        byteToCharMap_: null,
        /**
         * Maps characters to bytes.
         */
        charToByteMap_: null,
        /**
         * Maps bytes to websafe characters.
         * @private
         */
        byteToCharMapWebSafe_: null,
        /**
         * Maps websafe characters to bytes.
         * @private
         */
        charToByteMapWebSafe_: null,
        /**
         * Our default alphabet, shared between
         * ENCODED_VALS and ENCODED_VALS_WEBSAFE
         */
        ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
        /**
         * Our default alphabet. Value 64 (=) is special; it means "nothing."
         */
        get ENCODED_VALS() {
            return this.ENCODED_VALS_BASE + '+/=';
        },
        /**
         * Our websafe alphabet.
         */
        get ENCODED_VALS_WEBSAFE() {
            return this.ENCODED_VALS_BASE + '-_.';
        },
        /**
         * Whether this browser supports the atob and btoa functions. This extension
         * started at Mozilla but is now implemented by many browsers. We use the
         * ASSUME_* variables to avoid pulling in the full useragent detection library
         * but still allowing the standard per-browser compilations.
         *
         */
        HAS_NATIVE_SUPPORT: typeof atob === 'function',
        /**
         * Base64-encode an array of bytes.
         *
         * @param input An array of bytes (numbers with
         *     value in [0, 255]) to encode.
         * @param webSafe Boolean indicating we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeByteArray(input, webSafe) {
            if (!Array.isArray(input)) {
                throw Error('encodeByteArray takes an array as a parameter');
            }
            this.init_();
            const byteToCharMap = webSafe
                ? this.byteToCharMapWebSafe_
                : this.byteToCharMap_;
            const output = [];
            for (let i = 0; i < input.length; i += 3) {
                const byte1 = input[i];
                const haveByte2 = i + 1 < input.length;
                const byte2 = haveByte2 ? input[i + 1] : 0;
                const haveByte3 = i + 2 < input.length;
                const byte3 = haveByte3 ? input[i + 2] : 0;
                const outByte1 = byte1 >> 2;
                const outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
                let outByte3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
                let outByte4 = byte3 & 0x3f;
                if (!haveByte3) {
                    outByte4 = 64;
                    if (!haveByte2) {
                        outByte3 = 64;
                    }
                }
                output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
            }
            return output.join('');
        },
        /**
         * Base64-encode a string.
         *
         * @param input A string to encode.
         * @param webSafe If true, we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeString(input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return btoa(input);
            }
            return this.encodeByteArray(stringToByteArray$1(input), webSafe);
        },
        /**
         * Base64-decode a string.
         *
         * @param input to decode.
         * @param webSafe True if we should use the
         *     alternative alphabet.
         * @return string representing the decoded value.
         */
        decodeString(input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return atob(input);
            }
            return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
        },
        /**
         * Base64-decode a string.
         *
         * In base-64 decoding, groups of four characters are converted into three
         * bytes.  If the encoder did not apply padding, the input length may not
         * be a multiple of 4.
         *
         * In this case, the last group will have fewer than 4 characters, and
         * padding will be inferred.  If the group has one or two characters, it decodes
         * to one byte.  If the group has three characters, it decodes to two bytes.
         *
         * @param input Input to decode.
         * @param webSafe True if we should use the web-safe alphabet.
         * @return bytes representing the decoded value.
         */
        decodeStringToByteArray(input, webSafe) {
            this.init_();
            const charToByteMap = webSafe
                ? this.charToByteMapWebSafe_
                : this.charToByteMap_;
            const output = [];
            for (let i = 0; i < input.length;) {
                const byte1 = charToByteMap[input.charAt(i++)];
                const haveByte2 = i < input.length;
                const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
                ++i;
                const haveByte3 = i < input.length;
                const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                const haveByte4 = i < input.length;
                const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
                    throw new DecodeBase64StringError();
                }
                const outByte1 = (byte1 << 2) | (byte2 >> 4);
                output.push(outByte1);
                if (byte3 !== 64) {
                    const outByte2 = ((byte2 << 4) & 0xf0) | (byte3 >> 2);
                    output.push(outByte2);
                    if (byte4 !== 64) {
                        const outByte3 = ((byte3 << 6) & 0xc0) | byte4;
                        output.push(outByte3);
                    }
                }
            }
            return output;
        },
        /**
         * Lazy static initialization function. Called before
         * accessing any of the static map variables.
         * @private
         */
        init_() {
            if (!this.byteToCharMap_) {
                this.byteToCharMap_ = {};
                this.charToByteMap_ = {};
                this.byteToCharMapWebSafe_ = {};
                this.charToByteMapWebSafe_ = {};
                // We want quick mappings back and forth, so we precompute two maps.
                for (let i = 0; i < this.ENCODED_VALS.length; i++) {
                    this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
                    this.charToByteMap_[this.byteToCharMap_[i]] = i;
                    this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
                    this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
                    // Be forgiving when decoding and correctly decode both encodings.
                    if (i >= this.ENCODED_VALS_BASE.length) {
                        this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                        this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
                    }
                }
            }
        }
    };
    /**
     * An error encountered while decoding base64 string.
     */
    class DecodeBase64StringError extends Error {
        constructor() {
            super(...arguments);
            this.name = 'DecodeBase64StringError';
        }
    }
    /**
     * URL-safe base64 encoding
     */
    const base64Encode = function (str) {
        const utf8Bytes = stringToByteArray$1(str);
        return base64.encodeByteArray(utf8Bytes, true);
    };
    /**
     * URL-safe base64 encoding (without "." padding in the end).
     * e.g. Used in JSON Web Token (JWT) parts.
     */
    const base64urlEncodeWithoutPadding = function (str) {
        // Use base64url encoding and remove padding in the end (dot characters).
        return base64Encode(str).replace(/\./g, '');
    };
    /**
     * URL-safe base64 decoding
     *
     * NOTE: DO NOT use the global atob() function - it does NOT support the
     * base64Url variant encoding.
     *
     * @param str To be decoded
     * @return Decoded result, if possible
     */
    const base64Decode = function (str) {
        try {
            return base64.decodeString(str, true);
        }
        catch (e) {
            console.error('base64Decode failed: ', e);
        }
        return null;
    };

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Polyfill for `globalThis` object.
     * @returns the `globalThis` object for the given environment.
     * @public
     */
    function getGlobal() {
        if (typeof self !== 'undefined') {
            return self;
        }
        if (typeof window !== 'undefined') {
            return window;
        }
        if (typeof global !== 'undefined') {
            return global;
        }
        throw new Error('Unable to locate global object.');
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
    /**
     * Attempt to read defaults from a JSON string provided to
     * process(.)env(.)__FIREBASE_DEFAULTS__ or a JSON file whose path is in
     * process(.)env(.)__FIREBASE_DEFAULTS_PATH__
     * The dots are in parens because certain compilers (Vite?) cannot
     * handle seeing that variable in comments.
     * See https://github.com/firebase/firebase-js-sdk/issues/6838
     */
    const getDefaultsFromEnvVariable = () => {
        if (typeof process === 'undefined' || typeof process.env === 'undefined') {
            return;
        }
        const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
        if (defaultsJsonString) {
            return JSON.parse(defaultsJsonString);
        }
    };
    const getDefaultsFromCookie = () => {
        if (typeof document === 'undefined') {
            return;
        }
        let match;
        try {
            match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
        }
        catch (e) {
            // Some environments such as Angular Universal SSR have a
            // `document` object but error on accessing `document.cookie`.
            return;
        }
        const decoded = match && base64Decode(match[1]);
        return decoded && JSON.parse(decoded);
    };
    /**
     * Get the __FIREBASE_DEFAULTS__ object. It checks in order:
     * (1) if such an object exists as a property of `globalThis`
     * (2) if such an object was provided on a shell environment variable
     * (3) if such an object exists in a cookie
     * @public
     */
    const getDefaults = () => {
        try {
            return (getDefaultsFromPostinstall() ||
                getDefaultsFromGlobal() ||
                getDefaultsFromEnvVariable() ||
                getDefaultsFromCookie());
        }
        catch (e) {
            /**
             * Catch-all for being unable to get __FIREBASE_DEFAULTS__ due
             * to any environment case we have not accounted for. Log to
             * info instead of swallowing so we can find these unknown cases
             * and add paths for them if needed.
             */
            console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
            return;
        }
    };
    /**
     * Returns Firebase app config stored in the __FIREBASE_DEFAULTS__ object.
     * @public
     */
    const getDefaultAppConfig = () => getDefaults()?.config;
    /**
     * Returns an experimental setting on the __FIREBASE_DEFAULTS__ object (properties
     * prefixed by "_")
     * @public
     */
    const getExperimentalSetting = (name) => getDefaults()?.[`_${name}`];

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class Deferred {
        constructor() {
            this.reject = () => { };
            this.resolve = () => { };
            this.promise = new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        }
        /**
         * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
         * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
         * and returns a node-style callback which will resolve or reject the Deferred's promise.
         */
        wrapCallback(callback) {
            return (error, value) => {
                if (error) {
                    this.reject(error);
                }
                else {
                    this.resolve(value);
                }
                if (typeof callback === 'function') {
                    // Attaching noop handler just in case developer wasn't expecting
                    // promises
                    this.promise.catch(() => { });
                    // Some of our callbacks don't expect a value and our own tests
                    // assert that the parameter length is 1
                    if (callback.length === 1) {
                        callback(error);
                    }
                    else {
                        callback(error, value);
                    }
                }
            };
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns navigator.userAgent string or '' if it's not defined.
     * @return user agent string
     */
    function getUA() {
        if (typeof navigator !== 'undefined' &&
            typeof navigator['userAgent'] === 'string') {
            return navigator['userAgent'];
        }
        else {
            return '';
        }
    }
    /**
     * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
     *
     * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
     * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
     * wait for a callback.
     */
    function isMobileCordova() {
        return (typeof window !== 'undefined' &&
            // @ts-ignore Setting up an broadly applicable index signature for Window
            // just to deal with this case would probably be a bad idea.
            !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
            /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA()));
    }
    /**
     * Detect Cloudflare Worker context.
     */
    function isCloudflareWorker() {
        return (typeof navigator !== 'undefined' &&
            navigator.userAgent === 'Cloudflare-Workers');
    }
    function isBrowserExtension() {
        const runtime = typeof chrome === 'object'
            ? chrome.runtime
            : typeof browser === 'object'
                ? browser.runtime
                : undefined;
        return typeof runtime === 'object' && runtime.id !== undefined;
    }
    /**
     * Detect React Native.
     *
     * @return true if ReactNative environment is detected.
     */
    function isReactNative() {
        return (typeof navigator === 'object' && navigator['product'] === 'ReactNative');
    }
    /**
     * This method checks if indexedDB is supported by current browser/service worker context
     * @return true if indexedDB is supported by current browser/service worker context
     */
    function isIndexedDBAvailable() {
        try {
            return typeof indexedDB === 'object';
        }
        catch (e) {
            return false;
        }
    }
    /**
     * This method validates browser/sw context for indexedDB by opening a dummy indexedDB database and reject
     * if errors occur during the database open operation.
     *
     * @throws exception if current browser/sw context can't run idb.open (ex: Safari iframe, Firefox
     * private browsing)
     */
    function validateIndexedDBOpenable() {
        return new Promise((resolve, reject) => {
            try {
                let preExist = true;
                const DB_CHECK_NAME = 'validate-browser-context-for-indexeddb-analytics-module';
                const request = self.indexedDB.open(DB_CHECK_NAME);
                request.onsuccess = () => {
                    request.result.close();
                    // delete database only when it doesn't pre-exist
                    if (!preExist) {
                        self.indexedDB.deleteDatabase(DB_CHECK_NAME);
                    }
                    resolve(true);
                };
                request.onupgradeneeded = () => {
                    preExist = false;
                };
                request.onerror = () => {
                    reject(request.error?.message || '');
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview Standardized Firebase Error.
     *
     * Usage:
     *
     *   // TypeScript string literals for type-safe codes
     *   type Err =
     *     'unknown' |
     *     'object-not-found'
     *     ;
     *
     *   // Closure enum for type-safe error codes
     *   // at-enum {string}
     *   var Err = {
     *     UNKNOWN: 'unknown',
     *     OBJECT_NOT_FOUND: 'object-not-found',
     *   }
     *
     *   let errors: Map<Err, string> = {
     *     'generic-error': "Unknown error",
     *     'file-not-found': "Could not find file: {$file}",
     *   };
     *
     *   // Type-safe function - must pass a valid error code as param.
     *   let error = new ErrorFactory<Err>('service', 'Service', errors);
     *
     *   ...
     *   throw error.create(Err.GENERIC);
     *   ...
     *   throw error.create(Err.FILE_NOT_FOUND, {'file': fileName});
     *   ...
     *   // Service: Could not file file: foo.txt (service/file-not-found).
     *
     *   catch (e) {
     *     assert(e.message === "Could not find file: foo.txt.");
     *     if ((e as FirebaseError)?.code === 'service/file-not-found') {
     *       console.log("Could not read file: " + e['file']);
     *     }
     *   }
     */
    const ERROR_NAME = 'FirebaseError';
    // Based on code from:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
    class FirebaseError extends Error {
        constructor(
        /** The error code for this error. */
        code, message, 
        /** Custom data for this error. */
        customData) {
            super(message);
            this.code = code;
            this.customData = customData;
            /** The custom name for all FirebaseErrors. */
            this.name = ERROR_NAME;
            // Fix For ES5
            // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
            // TODO(dlarocque): Replace this with `new.target`: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
            //                   which we can now use since we no longer target ES5.
            Object.setPrototypeOf(this, FirebaseError.prototype);
            // Maintains proper stack trace for where our error was thrown.
            // Only available on V8.
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, ErrorFactory.prototype.create);
            }
        }
    }
    class ErrorFactory {
        constructor(service, serviceName, errors) {
            this.service = service;
            this.serviceName = serviceName;
            this.errors = errors;
        }
        create(code, ...data) {
            const customData = data[0] || {};
            const fullCode = `${this.service}/${code}`;
            const template = this.errors[code];
            const message = template ? replaceTemplate(template, customData) : 'Error';
            // Service Name: Error message (service/code).
            const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
            const error = new FirebaseError(fullCode, fullMessage, customData);
            return error;
        }
    }
    function replaceTemplate(template, data) {
        return template.replace(PATTERN, (_, key) => {
            const value = data[key];
            return value != null ? String(value) : `<${key}?>`;
        });
    }
    const PATTERN = /\{\$([^}]+)}/g;
    /**
     * Deep equal two objects. Support Arrays and Objects.
     */
    function deepEqual(a, b) {
        if (a === b) {
            return true;
        }
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        for (const k of aKeys) {
            if (!bKeys.includes(k)) {
                return false;
            }
            const aProp = a[k];
            const bProp = b[k];
            if (isObject(aProp) && isObject(bProp)) {
                if (!deepEqual(aProp, bProp)) {
                    return false;
                }
            }
            else if (aProp !== bProp) {
                return false;
            }
        }
        for (const k of bKeys) {
            if (!aKeys.includes(k)) {
                return false;
            }
        }
        return true;
    }
    function isObject(thing) {
        return thing !== null && typeof thing === 'object';
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a
     * params object (e.g. {arg: 'val', arg2: 'val2'})
     * Note: You must prepend it with ? when adding it to a URL.
     */
    function querystring(querystringParams) {
        const params = [];
        for (const [key, value] of Object.entries(querystringParams)) {
            if (Array.isArray(value)) {
                value.forEach(arrayVal => {
                    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
                });
            }
            else {
                params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            }
        }
        return params.length ? '&' + params.join('&') : '';
    }

    /**
     * Helper to make a Subscribe function (just like Promise helps make a
     * Thenable).
     *
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    function createSubscribe(executor, onNoObservers) {
        const proxy = new ObserverProxy(executor, onNoObservers);
        return proxy.subscribe.bind(proxy);
    }
    /**
     * Implement fan-out for any number of Observers attached via a subscribe
     * function.
     */
    class ObserverProxy {
        /**
         * @param executor Function which can make calls to a single Observer
         *     as a proxy.
         * @param onNoObservers Callback when count of Observers goes to zero.
         */
        constructor(executor, onNoObservers) {
            this.observers = [];
            this.unsubscribes = [];
            this.observerCount = 0;
            // Micro-task scheduling by calling task.then().
            this.task = Promise.resolve();
            this.finalized = false;
            this.onNoObservers = onNoObservers;
            // Call the executor asynchronously so subscribers that are called
            // synchronously after the creation of the subscribe function
            // can still receive the very first value generated in the executor.
            this.task
                .then(() => {
                executor(this);
            })
                .catch(e => {
                this.error(e);
            });
        }
        next(value) {
            this.forEachObserver((observer) => {
                observer.next(value);
            });
        }
        error(error) {
            this.forEachObserver((observer) => {
                observer.error(error);
            });
            this.close(error);
        }
        complete() {
            this.forEachObserver((observer) => {
                observer.complete();
            });
            this.close();
        }
        /**
         * Subscribe function that can be used to add an Observer to the fan-out list.
         *
         * - We require that no event is sent to a subscriber synchronously to their
         *   call to subscribe().
         */
        subscribe(nextOrObserver, error, complete) {
            let observer;
            if (nextOrObserver === undefined &&
                error === undefined &&
                complete === undefined) {
                throw new Error('Missing Observer.');
            }
            // Assemble an Observer object when passed as callback functions.
            if (implementsAnyMethods(nextOrObserver, [
                'next',
                'error',
                'complete'
            ])) {
                observer = nextOrObserver;
            }
            else {
                observer = {
                    next: nextOrObserver,
                    error,
                    complete
                };
            }
            if (observer.next === undefined) {
                observer.next = noop;
            }
            if (observer.error === undefined) {
                observer.error = noop;
            }
            if (observer.complete === undefined) {
                observer.complete = noop;
            }
            const unsub = this.unsubscribeOne.bind(this, this.observers.length);
            // Attempt to subscribe to a terminated Observable - we
            // just respond to the Observer with the final error or complete
            // event.
            if (this.finalized) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.task.then(() => {
                    try {
                        if (this.finalError) {
                            observer.error(this.finalError);
                        }
                        else {
                            observer.complete();
                        }
                    }
                    catch (e) {
                        // nothing
                    }
                    return;
                });
            }
            this.observers.push(observer);
            return unsub;
        }
        // Unsubscribe is synchronous - we guarantee that no events are sent to
        // any unsubscribed Observer.
        unsubscribeOne(i) {
            if (this.observers === undefined || this.observers[i] === undefined) {
                return;
            }
            delete this.observers[i];
            this.observerCount -= 1;
            if (this.observerCount === 0 && this.onNoObservers !== undefined) {
                this.onNoObservers(this);
            }
        }
        forEachObserver(fn) {
            if (this.finalized) {
                // Already closed by previous event....just eat the additional values.
                return;
            }
            // Since sendOne calls asynchronously - there is no chance that
            // this.observers will become undefined.
            for (let i = 0; i < this.observers.length; i++) {
                this.sendOne(i, fn);
            }
        }
        // Call the Observer via one of it's callback function. We are careful to
        // confirm that the observe has not been unsubscribed since this asynchronous
        // function had been queued.
        sendOne(i, fn) {
            // Execute the callback asynchronously
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(() => {
                if (this.observers !== undefined && this.observers[i] !== undefined) {
                    try {
                        fn(this.observers[i]);
                    }
                    catch (e) {
                        // Ignore exceptions raised in Observers or missing methods of an
                        // Observer.
                        // Log error to console. b/31404806
                        if (typeof console !== 'undefined' && console.error) {
                            console.error(e);
                        }
                    }
                }
            });
        }
        close(err) {
            if (this.finalized) {
                return;
            }
            this.finalized = true;
            if (err !== undefined) {
                this.finalError = err;
            }
            // Proxy is no longer needed - garbage collect references
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(() => {
                this.observers = undefined;
                this.onNoObservers = undefined;
            });
        }
    }
    /**
     * Return true if the object passed in implements any of the named methods.
     */
    function implementsAnyMethods(obj, methods) {
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }
        for (const method of methods) {
            if (method in obj && typeof obj[method] === 'function') {
                return true;
            }
        }
        return false;
    }
    function noop() {
        // do nothing
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function getModularInstance(service) {
        if (service && service._delegate) {
            return service._delegate;
        }
        else {
            return service;
        }
    }

    /**
     * @license
     * Copyright 2025 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Checks whether host is a cloud workstation or not.
     * @public
     */
    function isCloudWorkstation(url) {
        // `isCloudWorkstation` is called without protocol in certain connect*Emulator functions
        // In HTTP request builders, it's called with the protocol.
        // If called with protocol prefix, it's a valid URL, so we extract the hostname
        // If called without, we assume the string is the hostname.
        try {
            const host = url.startsWith('http://') || url.startsWith('https://')
                ? new URL(url).hostname
                : url;
            return host.endsWith('.cloudworkstations.dev');
        }
        catch {
            return false;
        }
    }

    /**
     * Component for service name T, e.g. `auth`, `auth-internal`
     */
    class Component {
        /**
         *
         * @param name The public service name, e.g. app, auth, firestore, database
         * @param instanceFactory Service factory responsible for creating the public interface
         * @param type whether the service provided by the component is public or private
         */
        constructor(name, instanceFactory, type) {
            this.name = name;
            this.instanceFactory = instanceFactory;
            this.type = type;
            this.multipleInstances = false;
            /**
             * Properties to be added to the service namespace
             */
            this.serviceProps = {};
            this.instantiationMode = "LAZY" /* InstantiationMode.LAZY */;
            this.onInstanceCreated = null;
        }
        setInstantiationMode(mode) {
            this.instantiationMode = mode;
            return this;
        }
        setMultipleInstances(multipleInstances) {
            this.multipleInstances = multipleInstances;
            return this;
        }
        setServiceProps(props) {
            this.serviceProps = props;
            return this;
        }
        setInstanceCreatedCallback(callback) {
            this.onInstanceCreated = callback;
            return this;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
     * NameServiceMapping[T] is an alias for the type of the instance
     */
    class Provider {
        constructor(name, container) {
            this.name = name;
            this.container = container;
            this.component = null;
            this.instances = new Map();
            this.instancesDeferred = new Map();
            this.instancesOptions = new Map();
            this.onInitCallbacks = new Map();
        }
        /**
         * @param identifier A provider can provide multiple instances of a service
         * if this.component.multipleInstances is true.
         */
        get(identifier) {
            // if multipleInstances is not supported, use the default name
            const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            if (!this.instancesDeferred.has(normalizedIdentifier)) {
                const deferred = new Deferred();
                this.instancesDeferred.set(normalizedIdentifier, deferred);
                if (this.isInitialized(normalizedIdentifier) ||
                    this.shouldAutoInitialize()) {
                    // initialize the service if it can be auto-initialized
                    try {
                        const instance = this.getOrInitializeService({
                            instanceIdentifier: normalizedIdentifier
                        });
                        if (instance) {
                            deferred.resolve(instance);
                        }
                    }
                    catch (e) {
                        // when the instance factory throws an exception during get(), it should not cause
                        // a fatal error. We just return the unresolved promise in this case.
                    }
                }
            }
            return this.instancesDeferred.get(normalizedIdentifier).promise;
        }
        getImmediate(options) {
            // if multipleInstances is not supported, use the default name
            const normalizedIdentifier = this.normalizeInstanceIdentifier(options?.identifier);
            const optional = options?.optional ?? false;
            if (this.isInitialized(normalizedIdentifier) ||
                this.shouldAutoInitialize()) {
                try {
                    return this.getOrInitializeService({
                        instanceIdentifier: normalizedIdentifier
                    });
                }
                catch (e) {
                    if (optional) {
                        return null;
                    }
                    else {
                        throw e;
                    }
                }
            }
            else {
                // In case a component is not initialized and should/cannot be auto-initialized at the moment, return null if the optional flag is set, or throw
                if (optional) {
                    return null;
                }
                else {
                    throw Error(`Service ${this.name} is not available`);
                }
            }
        }
        getComponent() {
            return this.component;
        }
        setComponent(component) {
            if (component.name !== this.name) {
                throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
            }
            if (this.component) {
                throw Error(`Component for ${this.name} has already been provided`);
            }
            this.component = component;
            // return early without attempting to initialize the component if the component requires explicit initialization (calling `Provider.initialize()`)
            if (!this.shouldAutoInitialize()) {
                return;
            }
            // if the service is eager, initialize the default instance
            if (isComponentEager(component)) {
                try {
                    this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME$1 });
                }
                catch (e) {
                    // when the instance factory for an eager Component throws an exception during the eager
                    // initialization, it should not cause a fatal error.
                    // TODO: Investigate if we need to make it configurable, because some component may want to cause
                    // a fatal error in this case?
                }
            }
            // Create service instances for the pending promises and resolve them
            // NOTE: if this.multipleInstances is false, only the default instance will be created
            // and all promises with resolve with it regardless of the identifier.
            for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
                const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                try {
                    // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
                    const instance = this.getOrInitializeService({
                        instanceIdentifier: normalizedIdentifier
                    });
                    instanceDeferred.resolve(instance);
                }
                catch (e) {
                    // when the instance factory throws an exception, it should not cause
                    // a fatal error. We just leave the promise unresolved.
                }
            }
        }
        clearInstance(identifier = DEFAULT_ENTRY_NAME$1) {
            this.instancesDeferred.delete(identifier);
            this.instancesOptions.delete(identifier);
            this.instances.delete(identifier);
        }
        // app.delete() will call this method on every provider to delete the services
        // TODO: should we mark the provider as deleted?
        async delete() {
            const services = Array.from(this.instances.values());
            await Promise.all([
                ...services
                    .filter(service => 'INTERNAL' in service) // legacy services
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map(service => service.INTERNAL.delete()),
                ...services
                    .filter(service => '_delete' in service) // modularized services
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map(service => service._delete())
            ]);
        }
        isComponentSet() {
            return this.component != null;
        }
        isInitialized(identifier = DEFAULT_ENTRY_NAME$1) {
            return this.instances.has(identifier);
        }
        getOptions(identifier = DEFAULT_ENTRY_NAME$1) {
            return this.instancesOptions.get(identifier) || {};
        }
        initialize(opts = {}) {
            const { options = {} } = opts;
            const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
            if (this.isInitialized(normalizedIdentifier)) {
                throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
            }
            if (!this.isComponentSet()) {
                throw Error(`Component ${this.name} has not been registered yet`);
            }
            const instance = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier,
                options
            });
            // resolve any pending promise waiting for the service instance
            for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
                const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                if (normalizedIdentifier === normalizedDeferredIdentifier) {
                    instanceDeferred.resolve(instance);
                }
            }
            return instance;
        }
        /**
         *
         * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
         * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
         *
         * @param identifier An optional instance identifier
         * @returns a function to unregister the callback
         */
        onInit(callback, identifier) {
            const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            const existingCallbacks = this.onInitCallbacks.get(normalizedIdentifier) ??
                new Set();
            existingCallbacks.add(callback);
            this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
            const existingInstance = this.instances.get(normalizedIdentifier);
            if (existingInstance) {
                callback(existingInstance, normalizedIdentifier);
            }
            return () => {
                existingCallbacks.delete(callback);
            };
        }
        /**
         * Invoke onInit callbacks synchronously
         * @param instance the service instance`
         */
        invokeOnInitCallbacks(instance, identifier) {
            const callbacks = this.onInitCallbacks.get(identifier);
            if (!callbacks) {
                return;
            }
            for (const callback of callbacks) {
                try {
                    callback(instance, identifier);
                }
                catch {
                    // ignore errors in the onInit callback
                }
            }
        }
        getOrInitializeService({ instanceIdentifier, options = {} }) {
            let instance = this.instances.get(instanceIdentifier);
            if (!instance && this.component) {
                instance = this.component.instanceFactory(this.container, {
                    instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
                    options
                });
                this.instances.set(instanceIdentifier, instance);
                this.instancesOptions.set(instanceIdentifier, options);
                /**
                 * Invoke onInit listeners.
                 * Note this.component.onInstanceCreated is different, which is used by the component creator,
                 * while onInit listeners are registered by consumers of the provider.
                 */
                this.invokeOnInitCallbacks(instance, instanceIdentifier);
                /**
                 * Order is important
                 * onInstanceCreated() should be called after this.instances.set(instanceIdentifier, instance); which
                 * makes `isInitialized()` return true.
                 */
                if (this.component.onInstanceCreated) {
                    try {
                        this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
                    }
                    catch {
                        // ignore errors in the onInstanceCreatedCallback
                    }
                }
            }
            return instance || null;
        }
        normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME$1) {
            if (this.component) {
                return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
            }
            else {
                return identifier; // assume multiple instances are supported before the component is provided.
            }
        }
        shouldAutoInitialize() {
            return (!!this.component &&
                this.component.instantiationMode !== "EXPLICIT" /* InstantiationMode.EXPLICIT */);
        }
    }
    // undefined should be passed to the service factory for the default instance
    function normalizeIdentifierForFactory(identifier) {
        return identifier === DEFAULT_ENTRY_NAME$1 ? undefined : identifier;
    }
    function isComponentEager(component) {
        return component.instantiationMode === "EAGER" /* InstantiationMode.EAGER */;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
     */
    class ComponentContainer {
        constructor(name) {
            this.name = name;
            this.providers = new Map();
        }
        /**
         *
         * @param component Component being added
         * @param overwrite When a component with the same name has already been registered,
         * if overwrite is true: overwrite the existing component with the new component and create a new
         * provider with the new component. It can be useful in tests where you want to use different mocks
         * for different tests.
         * if overwrite is false: throw an exception
         */
        addComponent(component) {
            const provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
            }
            provider.setComponent(component);
        }
        addOrOverwriteComponent(component) {
            const provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                // delete the existing provider from the container, so we can register the new component
                this.providers.delete(component.name);
            }
            this.addComponent(component);
        }
        /**
         * getProvider provides a type safe interface where it can only be called with a field name
         * present in NameServiceMapping interface.
         *
         * Firebase SDKs providing services should extend NameServiceMapping interface to register
         * themselves.
         */
        getProvider(name) {
            if (this.providers.has(name)) {
                return this.providers.get(name);
            }
            // create a Provider for a service that hasn't registered with Firebase
            const provider = new Provider(name, this);
            this.providers.set(name, provider);
            return provider;
        }
        getProviders() {
            return Array.from(this.providers.values());
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A container for all of the Logger instances
     */
    /**
     * The JS SDK supports 5 log levels and also allows a user the ability to
     * silence the logs altogether.
     *
     * The order is a follows:
     * DEBUG < VERBOSE < INFO < WARN < ERROR
     *
     * All of the log types above the current log level will be captured (i.e. if
     * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
     * `VERBOSE` logs will not)
     */
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
        LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
        LogLevel[LogLevel["INFO"] = 2] = "INFO";
        LogLevel[LogLevel["WARN"] = 3] = "WARN";
        LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
        LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
    })(LogLevel || (LogLevel = {}));
    const levelStringToEnum = {
        'debug': LogLevel.DEBUG,
        'verbose': LogLevel.VERBOSE,
        'info': LogLevel.INFO,
        'warn': LogLevel.WARN,
        'error': LogLevel.ERROR,
        'silent': LogLevel.SILENT
    };
    /**
     * The default log level
     */
    const defaultLogLevel = LogLevel.INFO;
    /**
     * By default, `console.debug` is not displayed in the developer console (in
     * chrome). To avoid forcing users to have to opt-in to these logs twice
     * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
     * logs to the `console.log` function.
     */
    const ConsoleMethod = {
        [LogLevel.DEBUG]: 'log',
        [LogLevel.VERBOSE]: 'log',
        [LogLevel.INFO]: 'info',
        [LogLevel.WARN]: 'warn',
        [LogLevel.ERROR]: 'error'
    };
    /**
     * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
     * messages on to their corresponding console counterparts (if the log method
     * is supported by the current log level)
     */
    const defaultLogHandler = (instance, logType, ...args) => {
        if (logType < instance.logLevel) {
            return;
        }
        const now = new Date().toISOString();
        const method = ConsoleMethod[logType];
        if (method) {
            console[method](`[${now}]  ${instance.name}:`, ...args);
        }
        else {
            throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
        }
    };
    class Logger {
        /**
         * Gives you an instance of a Logger to capture messages according to
         * Firebase's logging scheme.
         *
         * @param name The name that the logs will be associated with
         */
        constructor(name) {
            this.name = name;
            /**
             * The log level of the given Logger instance.
             */
            this._logLevel = defaultLogLevel;
            /**
             * The main (internal) log handler for the Logger instance.
             * Can be set to a new function in internal package code but not by user.
             */
            this._logHandler = defaultLogHandler;
            /**
             * The optional, additional, user-defined log handler for the Logger instance.
             */
            this._userLogHandler = null;
        }
        get logLevel() {
            return this._logLevel;
        }
        set logLevel(val) {
            if (!(val in LogLevel)) {
                throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
            }
            this._logLevel = val;
        }
        // Workaround for setter/getter having to be the same type.
        setLogLevel(val) {
            this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
        }
        get logHandler() {
            return this._logHandler;
        }
        set logHandler(val) {
            if (typeof val !== 'function') {
                throw new TypeError('Value assigned to `logHandler` must be a function');
            }
            this._logHandler = val;
        }
        get userLogHandler() {
            return this._userLogHandler;
        }
        set userLogHandler(val) {
            this._userLogHandler = val;
        }
        /**
         * The functions below are all based on the `console` interface
         */
        debug(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
            this._logHandler(this, LogLevel.DEBUG, ...args);
        }
        log(...args) {
            this._userLogHandler &&
                this._userLogHandler(this, LogLevel.VERBOSE, ...args);
            this._logHandler(this, LogLevel.VERBOSE, ...args);
        }
        info(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
            this._logHandler(this, LogLevel.INFO, ...args);
        }
        warn(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
            this._logHandler(this, LogLevel.WARN, ...args);
        }
        error(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
            this._logHandler(this, LogLevel.ERROR, ...args);
        }
    }

    const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

    let idbProxyableTypes;
    let cursorAdvanceMethods;
    // This is a function to prevent it throwing up in node environments.
    function getIdbProxyableTypes() {
        return (idbProxyableTypes ||
            (idbProxyableTypes = [
                IDBDatabase,
                IDBObjectStore,
                IDBIndex,
                IDBCursor,
                IDBTransaction,
            ]));
    }
    // This is a function to prevent it throwing up in node environments.
    function getCursorAdvanceMethods() {
        return (cursorAdvanceMethods ||
            (cursorAdvanceMethods = [
                IDBCursor.prototype.advance,
                IDBCursor.prototype.continue,
                IDBCursor.prototype.continuePrimaryKey,
            ]));
    }
    const cursorRequestMap = new WeakMap();
    const transactionDoneMap = new WeakMap();
    const transactionStoreNamesMap = new WeakMap();
    const transformCache = new WeakMap();
    const reverseTransformCache = new WeakMap();
    function promisifyRequest(request) {
        const promise = new Promise((resolve, reject) => {
            const unlisten = () => {
                request.removeEventListener('success', success);
                request.removeEventListener('error', error);
            };
            const success = () => {
                resolve(wrap(request.result));
                unlisten();
            };
            const error = () => {
                reject(request.error);
                unlisten();
            };
            request.addEventListener('success', success);
            request.addEventListener('error', error);
        });
        promise
            .then((value) => {
            // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
            // (see wrapFunction).
            if (value instanceof IDBCursor) {
                cursorRequestMap.set(value, request);
            }
            // Catching to avoid "Uncaught Promise exceptions"
        })
            .catch(() => { });
        // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
        // is because we create many promises from a single IDBRequest.
        reverseTransformCache.set(promise, request);
        return promise;
    }
    function cacheDonePromiseForTransaction(tx) {
        // Early bail if we've already created a done promise for this transaction.
        if (transactionDoneMap.has(tx))
            return;
        const done = new Promise((resolve, reject) => {
            const unlisten = () => {
                tx.removeEventListener('complete', complete);
                tx.removeEventListener('error', error);
                tx.removeEventListener('abort', error);
            };
            const complete = () => {
                resolve();
                unlisten();
            };
            const error = () => {
                reject(tx.error || new DOMException('AbortError', 'AbortError'));
                unlisten();
            };
            tx.addEventListener('complete', complete);
            tx.addEventListener('error', error);
            tx.addEventListener('abort', error);
        });
        // Cache it for later retrieval.
        transactionDoneMap.set(tx, done);
    }
    let idbProxyTraps = {
        get(target, prop, receiver) {
            if (target instanceof IDBTransaction) {
                // Special handling for transaction.done.
                if (prop === 'done')
                    return transactionDoneMap.get(target);
                // Polyfill for objectStoreNames because of Edge.
                if (prop === 'objectStoreNames') {
                    return target.objectStoreNames || transactionStoreNamesMap.get(target);
                }
                // Make tx.store return the only store in the transaction, or undefined if there are many.
                if (prop === 'store') {
                    return receiver.objectStoreNames[1]
                        ? undefined
                        : receiver.objectStore(receiver.objectStoreNames[0]);
                }
            }
            // Else transform whatever we get back.
            return wrap(target[prop]);
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        },
        has(target, prop) {
            if (target instanceof IDBTransaction &&
                (prop === 'done' || prop === 'store')) {
                return true;
            }
            return prop in target;
        },
    };
    function replaceTraps(callback) {
        idbProxyTraps = callback(idbProxyTraps);
    }
    function wrapFunction(func) {
        // Due to expected object equality (which is enforced by the caching in `wrap`), we
        // only create one new func per func.
        // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
        if (func === IDBDatabase.prototype.transaction &&
            !('objectStoreNames' in IDBTransaction.prototype)) {
            return function (storeNames, ...args) {
                const tx = func.call(unwrap(this), storeNames, ...args);
                transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
                return wrap(tx);
            };
        }
        // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
        // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
        // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
        // with real promises, so each advance methods returns a new promise for the cursor object, or
        // undefined if the end of the cursor has been reached.
        if (getCursorAdvanceMethods().includes(func)) {
            return function (...args) {
                // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
                // the original object.
                func.apply(unwrap(this), args);
                return wrap(cursorRequestMap.get(this));
            };
        }
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            return wrap(func.apply(unwrap(this), args));
        };
    }
    function transformCachableValue(value) {
        if (typeof value === 'function')
            return wrapFunction(value);
        // This doesn't return, it just creates a 'done' promise for the transaction,
        // which is later returned for transaction.done (see idbObjectHandler).
        if (value instanceof IDBTransaction)
            cacheDonePromiseForTransaction(value);
        if (instanceOfAny(value, getIdbProxyableTypes()))
            return new Proxy(value, idbProxyTraps);
        // Return the same value back if we're not going to transform it.
        return value;
    }
    function wrap(value) {
        // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
        // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
        if (value instanceof IDBRequest)
            return promisifyRequest(value);
        // If we've already transformed this value before, reuse the transformed value.
        // This is faster, but it also provides object equality.
        if (transformCache.has(value))
            return transformCache.get(value);
        const newValue = transformCachableValue(value);
        // Not all types are transformed.
        // These may be primitive types, so they can't be WeakMap keys.
        if (newValue !== value) {
            transformCache.set(value, newValue);
            reverseTransformCache.set(newValue, value);
        }
        return newValue;
    }
    const unwrap = (value) => reverseTransformCache.get(value);

    /**
     * Open a database.
     *
     * @param name Name of the database.
     * @param version Schema version.
     * @param callbacks Additional callbacks.
     */
    function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
        const request = indexedDB.open(name, version);
        const openPromise = wrap(request);
        if (upgrade) {
            request.addEventListener('upgradeneeded', (event) => {
                upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
            });
        }
        if (blocked) {
            request.addEventListener('blocked', (event) => blocked(
            // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
            event.oldVersion, event.newVersion, event));
        }
        openPromise
            .then((db) => {
            if (terminated)
                db.addEventListener('close', () => terminated());
            if (blocking) {
                db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
            }
        })
            .catch(() => { });
        return openPromise;
    }

    const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
    const writeMethods = ['put', 'add', 'delete', 'clear'];
    const cachedMethods = new Map();
    function getMethod(target, prop) {
        if (!(target instanceof IDBDatabase &&
            !(prop in target) &&
            typeof prop === 'string')) {
            return;
        }
        if (cachedMethods.get(prop))
            return cachedMethods.get(prop);
        const targetFuncName = prop.replace(/FromIndex$/, '');
        const useIndex = prop !== targetFuncName;
        const isWrite = writeMethods.includes(targetFuncName);
        if (
        // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
        !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
            !(isWrite || readMethods.includes(targetFuncName))) {
            return;
        }
        const method = async function (storeName, ...args) {
            // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
            const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
            let target = tx.store;
            if (useIndex)
                target = target.index(args.shift());
            // Must reject if op rejects.
            // If it's a write operation, must reject if tx.done rejects.
            // Must reject with op rejection first.
            // Must resolve with op value.
            // Must handle both promises (no unhandled rejections)
            return (await Promise.all([
                target[targetFuncName](...args),
                isWrite && tx.done,
            ]))[0];
        };
        cachedMethods.set(prop, method);
        return method;
    }
    replaceTraps((oldTraps) => ({
        ...oldTraps,
        get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
        has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
    }));

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class PlatformLoggerServiceImpl {
        constructor(container) {
            this.container = container;
        }
        // In initial implementation, this will be called by installations on
        // auth token refresh, and installations will send this string.
        getPlatformInfoString() {
            const providers = this.container.getProviders();
            // Loop through providers and get library/version pairs from any that are
            // version components.
            return providers
                .map(provider => {
                if (isVersionServiceProvider(provider)) {
                    const service = provider.getImmediate();
                    return `${service.library}/${service.version}`;
                }
                else {
                    return null;
                }
            })
                .filter(logString => logString)
                .join(' ');
        }
    }
    /**
     *
     * @param provider check if this provider provides a VersionService
     *
     * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
     * provides VersionService. The provider is not necessarily a 'app-version'
     * provider.
     */
    function isVersionServiceProvider(provider) {
        const component = provider.getComponent();
        return component?.type === "VERSION" /* ComponentType.VERSION */;
    }

    const name$q = "@firebase/app";
    const version$1$1 = "0.14.13";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const logger = new Logger('@firebase/app');

    const name$p = "@firebase/app-compat";

    const name$o = "@firebase/analytics-compat";

    const name$n = "@firebase/analytics";

    const name$m = "@firebase/app-check-compat";

    const name$l = "@firebase/app-check";

    const name$k = "@firebase/auth";

    const name$j = "@firebase/auth-compat";

    const name$i = "@firebase/database";

    const name$h = "@firebase/data-connect";

    const name$g = "@firebase/database-compat";

    const name$f = "@firebase/functions";

    const name$e = "@firebase/functions-compat";

    const name$d = "@firebase/installations";

    const name$c = "@firebase/installations-compat";

    const name$b = "@firebase/messaging";

    const name$a = "@firebase/messaging-compat";

    const name$9 = "@firebase/performance";

    const name$8 = "@firebase/performance-compat";

    const name$7 = "@firebase/remote-config";

    const name$6 = "@firebase/remote-config-compat";

    const name$5 = "@firebase/storage";

    const name$4 = "@firebase/storage-compat";

    const name$3 = "@firebase/firestore";

    const name$2 = "@firebase/ai";

    const name$1$1 = "@firebase/firestore-compat";

    const name$r = "firebase";
    const version$2 = "12.14.0";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The default app name
     *
     * @internal
     */
    const DEFAULT_ENTRY_NAME = '[DEFAULT]';
    const PLATFORM_LOG_STRING = {
        [name$q]: 'fire-core',
        [name$p]: 'fire-core-compat',
        [name$n]: 'fire-analytics',
        [name$o]: 'fire-analytics-compat',
        [name$l]: 'fire-app-check',
        [name$m]: 'fire-app-check-compat',
        [name$k]: 'fire-auth',
        [name$j]: 'fire-auth-compat',
        [name$i]: 'fire-rtdb',
        [name$h]: 'fire-data-connect',
        [name$g]: 'fire-rtdb-compat',
        [name$f]: 'fire-fn',
        [name$e]: 'fire-fn-compat',
        [name$d]: 'fire-iid',
        [name$c]: 'fire-iid-compat',
        [name$b]: 'fire-fcm',
        [name$a]: 'fire-fcm-compat',
        [name$9]: 'fire-perf',
        [name$8]: 'fire-perf-compat',
        [name$7]: 'fire-rc',
        [name$6]: 'fire-rc-compat',
        [name$5]: 'fire-gcs',
        [name$4]: 'fire-gcs-compat',
        [name$3]: 'fire-fst',
        [name$1$1]: 'fire-fst-compat',
        [name$2]: 'fire-vertex',
        'fire-js': 'fire-js', // Platform identifier for JS SDK.
        [name$r]: 'fire-js-all'
    };

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @internal
     */
    const _apps = new Map();
    /**
     * @internal
     */
    const _serverApps = new Map();
    /**
     * Registered components.
     *
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _components = new Map();
    /**
     * @param component - the component being added to this app's container
     *
     * @internal
     */
    function _addComponent(app, component) {
        try {
            app.container.addComponent(component);
        }
        catch (e) {
            logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
        }
    }
    /**
     *
     * @param component - the component to register
     * @returns whether or not the component is registered successfully
     *
     * @internal
     */
    function _registerComponent(component) {
        const componentName = component.name;
        if (_components.has(componentName)) {
            logger.debug(`There were multiple attempts to register component ${componentName}.`);
            return false;
        }
        _components.set(componentName, component);
        // add the component to existing app instances
        for (const app of _apps.values()) {
            _addComponent(app, component);
        }
        for (const serverApp of _serverApps.values()) {
            _addComponent(serverApp, component);
        }
        return true;
    }
    /**
     *
     * @param app - FirebaseApp instance
     * @param name - service name
     *
     * @returns the provider for the service with the matching name
     *
     * @internal
     */
    function _getProvider(app, name) {
        const heartbeatController = app.container
            .getProvider('heartbeat')
            .getImmediate({ optional: true });
        if (heartbeatController) {
            void heartbeatController.triggerHeartbeat();
        }
        return app.container.getProvider(name);
    }
    /**
     *
     * @param obj - an object of type FirebaseApp.
     *
     * @returns true if the provided object is of type FirebaseServerAppImpl.
     *
     * @internal
     */
    function _isFirebaseServerApp(obj) {
        if (obj === null || obj === undefined) {
            return false;
        }
        return obj.settings !== undefined;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const ERRORS = {
        ["no-app" /* AppError.NO_APP */]: "No Firebase App '{$appName}' has been created - " +
            'call initializeApp() first',
        ["bad-app-name" /* AppError.BAD_APP_NAME */]: "Illegal App name: '{$appName}'",
        ["duplicate-app" /* AppError.DUPLICATE_APP */]: "Firebase App named '{$appName}' already exists with different options or config",
        ["app-deleted" /* AppError.APP_DELETED */]: "Firebase App named '{$appName}' already deleted",
        ["server-app-deleted" /* AppError.SERVER_APP_DELETED */]: 'Firebase Server App has been deleted',
        ["no-options" /* AppError.NO_OPTIONS */]: 'Need to provide options, when not being deployed to hosting via source.',
        ["invalid-app-argument" /* AppError.INVALID_APP_ARGUMENT */]: 'firebase.{$appName}() takes either no argument or a ' +
            'Firebase App instance.',
        ["invalid-log-argument" /* AppError.INVALID_LOG_ARGUMENT */]: 'First argument to `onLog` must be null or a function.',
        ["idb-open" /* AppError.IDB_OPEN */]: 'Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-get" /* AppError.IDB_GET */]: 'Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-set" /* AppError.IDB_WRITE */]: 'Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-delete" /* AppError.IDB_DELETE */]: 'Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.',
        ["finalization-registry-not-supported" /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */]: 'FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.',
        ["invalid-server-app-environment" /* AppError.INVALID_SERVER_APP_ENVIRONMENT */]: 'FirebaseServerApp is not for use in browser environments.'
    };
    const ERROR_FACTORY = new ErrorFactory('app', 'Firebase', ERRORS);

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class FirebaseAppImpl {
        constructor(options, config, container) {
            this._isDeleted = false;
            this._options = { ...options };
            this._config = { ...config };
            this._name = config.name;
            this._automaticDataCollectionEnabled =
                config.automaticDataCollectionEnabled;
            this._container = container;
            this.container.addComponent(new Component('app', () => this, "PUBLIC" /* ComponentType.PUBLIC */));
        }
        get automaticDataCollectionEnabled() {
            this.checkDestroyed();
            return this._automaticDataCollectionEnabled;
        }
        set automaticDataCollectionEnabled(val) {
            this.checkDestroyed();
            this._automaticDataCollectionEnabled = val;
        }
        get name() {
            this.checkDestroyed();
            return this._name;
        }
        get options() {
            this.checkDestroyed();
            return this._options;
        }
        get config() {
            this.checkDestroyed();
            return this._config;
        }
        get container() {
            return this._container;
        }
        get isDeleted() {
            return this._isDeleted;
        }
        set isDeleted(val) {
            this._isDeleted = val;
        }
        /**
         * This function will throw an Error if the App has already been deleted -
         * use before performing API actions on the App.
         */
        checkDestroyed() {
            if (this.isDeleted) {
                throw ERROR_FACTORY.create("app-deleted" /* AppError.APP_DELETED */, { appName: this._name });
            }
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The current SDK version.
     *
     * @public
     */
    const SDK_VERSION = version$2;
    function initializeApp(_options, rawConfig = {}) {
        let options = _options;
        if (typeof rawConfig !== 'object') {
            const name = rawConfig;
            rawConfig = { name };
        }
        const config = {
            name: DEFAULT_ENTRY_NAME,
            automaticDataCollectionEnabled: true,
            ...rawConfig
        };
        const name = config.name;
        if (typeof name !== 'string' || !name) {
            throw ERROR_FACTORY.create("bad-app-name" /* AppError.BAD_APP_NAME */, {
                appName: String(name)
            });
        }
        options || (options = getDefaultAppConfig());
        if (!options) {
            throw ERROR_FACTORY.create("no-options" /* AppError.NO_OPTIONS */);
        }
        const existingApp = _apps.get(name);
        if (existingApp) {
            // return the existing app if options and config deep equal the ones in the existing app.
            if (deepEqual(options, existingApp.options) &&
                deepEqual(config, existingApp.config)) {
                return existingApp;
            }
            else {
                throw ERROR_FACTORY.create("duplicate-app" /* AppError.DUPLICATE_APP */, { appName: name });
            }
        }
        const container = new ComponentContainer(name);
        for (const component of _components.values()) {
            container.addComponent(component);
        }
        const newApp = new FirebaseAppImpl(options, config, container);
        _apps.set(name, newApp);
        return newApp;
    }
    /**
     * Registers a library's name and version for platform logging purposes.
     * @param library - Name of 1p or 3p library (e.g. firestore, angularfire)
     * @param version - Current version of that library.
     * @param variant - Bundle variant, e.g., node, rn, etc.
     *
     * @public
     */
    function registerVersion(libraryKeyOrName, version, variant) {
        // TODO: We can use this check to whitelist strings when/if we set up
        // a good whitelist system.
        let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
        if (variant) {
            library += `-${variant}`;
        }
        const libraryMismatch = library.match(/\s|\//);
        const versionMismatch = version.match(/\s|\//);
        if (libraryMismatch || versionMismatch) {
            const warning = [
                `Unable to register library "${library}" with version "${version}":`
            ];
            if (libraryMismatch) {
                warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
            }
            if (libraryMismatch && versionMismatch) {
                warning.push('and');
            }
            if (versionMismatch) {
                warning.push(`version name "${version}" contains illegal characters (whitespace or "/")`);
            }
            logger.warn(warning.join(' '));
            return;
        }
        _registerComponent(new Component(`${library}-version`, () => ({ library, version }), "VERSION" /* ComponentType.VERSION */));
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DB_NAME$1 = 'firebase-heartbeat-database';
    const DB_VERSION$1 = 1;
    const STORE_NAME = 'firebase-heartbeat-store';
    let dbPromise = null;
    function getDbPromise() {
        if (!dbPromise) {
            dbPromise = openDB(DB_NAME$1, DB_VERSION$1, {
                upgrade: (db, oldVersion) => {
                    // We don't use 'break' in this switch statement, the fall-through
                    // behavior is what we want, because if there are multiple versions between
                    // the old version and the current version, we want ALL the migrations
                    // that correspond to those versions to run, not only the last one.
                    // eslint-disable-next-line default-case
                    switch (oldVersion) {
                        case 0:
                            try {
                                db.createObjectStore(STORE_NAME);
                            }
                            catch (e) {
                                // Safari/iOS browsers throw occasional exceptions on
                                // db.createObjectStore() that may be a bug. Avoid blocking
                                // the rest of the app functionality.
                                console.warn(e);
                            }
                    }
                }
            }).catch(e => {
                throw ERROR_FACTORY.create("idb-open" /* AppError.IDB_OPEN */, {
                    originalErrorMessage: e.message
                });
            });
        }
        return dbPromise;
    }
    async function readHeartbeatsFromIndexedDB(app) {
        try {
            const db = await getDbPromise();
            const tx = db.transaction(STORE_NAME);
            const result = await tx.objectStore(STORE_NAME).get(computeKey(app));
            // We already have the value but tx.done can throw,
            // so we need to await it here to catch errors
            await tx.done;
            return result;
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                logger.warn(e.message);
            }
            else {
                const idbGetError = ERROR_FACTORY.create("idb-get" /* AppError.IDB_GET */, {
                    originalErrorMessage: e?.message
                });
                logger.warn(idbGetError.message);
            }
        }
    }
    async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
        try {
            const db = await getDbPromise();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const objectStore = tx.objectStore(STORE_NAME);
            await objectStore.put(heartbeatObject, computeKey(app));
            await tx.done;
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                logger.warn(e.message);
            }
            else {
                const idbGetError = ERROR_FACTORY.create("idb-set" /* AppError.IDB_WRITE */, {
                    originalErrorMessage: e?.message
                });
                logger.warn(idbGetError.message);
            }
        }
    }
    function computeKey(app) {
        return `${app.name}!${app.options.appId}`;
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const MAX_HEADER_BYTES = 1024;
    const MAX_NUM_STORED_HEARTBEATS = 30;
    class HeartbeatServiceImpl {
        constructor(container) {
            this.container = container;
            /**
             * In-memory cache for heartbeats, used by getHeartbeatsHeader() to generate
             * the header string.
             * Stores one record per date. This will be consolidated into the standard
             * format of one record per user agent string before being sent as a header.
             * Populated from indexedDB when the controller is instantiated and should
             * be kept in sync with indexedDB.
             * Leave public for easier testing.
             */
            this._heartbeatsCache = null;
            const app = this.container.getProvider('app').getImmediate();
            this._storage = new HeartbeatStorageImpl(app);
            this._heartbeatsCachePromise = this._storage.read().then(result => {
                this._heartbeatsCache = result;
                return result;
            });
        }
        /**
         * Called to report a heartbeat. The function will generate
         * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
         * to IndexedDB.
         * Note that we only store one heartbeat per day. So if a heartbeat for today is
         * already logged, subsequent calls to this function in the same day will be ignored.
         */
        async triggerHeartbeat() {
            try {
                const platformLogger = this.container
                    .getProvider('platform-logger')
                    .getImmediate();
                // This is the "Firebase user agent" string from the platform logger
                // service, not the browser user agent.
                const agent = platformLogger.getPlatformInfoString();
                const date = getUTCDateString();
                if (this._heartbeatsCache?.heartbeats == null) {
                    this._heartbeatsCache = await this._heartbeatsCachePromise;
                    // If we failed to construct a heartbeats cache, then return immediately.
                    if (this._heartbeatsCache?.heartbeats == null) {
                        return;
                    }
                }
                // Do not store a heartbeat if one is already stored for this day
                // or if a header has already been sent today.
                if (this._heartbeatsCache.lastSentHeartbeatDate === date ||
                    this._heartbeatsCache.heartbeats.some(singleDateHeartbeat => singleDateHeartbeat.date === date)) {
                    return;
                }
                else {
                    // There is no entry for this date. Create one.
                    this._heartbeatsCache.heartbeats.push({ date, agent });
                    // If the number of stored heartbeats exceeds the maximum number of stored heartbeats, remove the heartbeat with the earliest date.
                    // Since this is executed each time a heartbeat is pushed, the limit can only be exceeded by one, so only one needs to be removed.
                    if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
                        const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
                        this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
                    }
                }
                return this._storage.overwrite(this._heartbeatsCache);
            }
            catch (e) {
                logger.warn(e);
            }
        }
        /**
         * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
         * It also clears all heartbeats from memory as well as in IndexedDB.
         *
         * NOTE: Consuming product SDKs should not send the header if this method
         * returns an empty string.
         */
        async getHeartbeatsHeader() {
            try {
                if (this._heartbeatsCache === null) {
                    await this._heartbeatsCachePromise;
                }
                // If it's still null or the array is empty, there is no data to send.
                if (this._heartbeatsCache?.heartbeats == null ||
                    this._heartbeatsCache.heartbeats.length === 0) {
                    return '';
                }
                const date = getUTCDateString();
                // Extract as many heartbeats from the cache as will fit under the size limit.
                const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
                const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
                // Store last sent date to prevent another being logged/sent for the same day.
                this._heartbeatsCache.lastSentHeartbeatDate = date;
                if (unsentEntries.length > 0) {
                    // Store any unsent entries if they exist.
                    this._heartbeatsCache.heartbeats = unsentEntries;
                    // This seems more likely than emptying the array (below) to lead to some odd state
                    // since the cache isn't empty and this will be called again on the next request,
                    // and is probably safest if we await it.
                    await this._storage.overwrite(this._heartbeatsCache);
                }
                else {
                    this._heartbeatsCache.heartbeats = [];
                    // Do not wait for this, to reduce latency.
                    void this._storage.overwrite(this._heartbeatsCache);
                }
                return headerString;
            }
            catch (e) {
                logger.warn(e);
                return '';
            }
        }
    }
    function getUTCDateString() {
        const today = new Date();
        // Returns date format 'YYYY-MM-DD'
        return today.toISOString().substring(0, 10);
    }
    function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
        // Heartbeats grouped by user agent in the standard format to be sent in
        // the header.
        const heartbeatsToSend = [];
        // Single date format heartbeats that are not sent.
        let unsentEntries = heartbeatsCache.slice();
        for (const singleDateHeartbeat of heartbeatsCache) {
            // Look for an existing entry with the same user agent.
            const heartbeatEntry = heartbeatsToSend.find(hb => hb.agent === singleDateHeartbeat.agent);
            if (!heartbeatEntry) {
                // If no entry for this user agent exists, create one.
                heartbeatsToSend.push({
                    agent: singleDateHeartbeat.agent,
                    dates: [singleDateHeartbeat.date]
                });
                if (countBytes(heartbeatsToSend) > maxSize) {
                    // If the header would exceed max size, remove the added heartbeat
                    // entry and stop adding to the header.
                    heartbeatsToSend.pop();
                    break;
                }
            }
            else {
                heartbeatEntry.dates.push(singleDateHeartbeat.date);
                // If the header would exceed max size, remove the added date
                // and stop adding to the header.
                if (countBytes(heartbeatsToSend) > maxSize) {
                    heartbeatEntry.dates.pop();
                    break;
                }
            }
            // Pop unsent entry from queue. (Skipped if adding the entry exceeded
            // quota and the loop breaks early.)
            unsentEntries = unsentEntries.slice(1);
        }
        return {
            heartbeatsToSend,
            unsentEntries
        };
    }
    class HeartbeatStorageImpl {
        constructor(app) {
            this.app = app;
            this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
        }
        async runIndexedDBEnvironmentCheck() {
            if (!isIndexedDBAvailable()) {
                return false;
            }
            else {
                return validateIndexedDBOpenable()
                    .then(() => true)
                    .catch(() => false);
            }
        }
        /**
         * Read all heartbeats.
         */
        async read() {
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return { heartbeats: [] };
            }
            else {
                const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
                if (idbHeartbeatObject?.heartbeats) {
                    return idbHeartbeatObject;
                }
                else {
                    return { heartbeats: [] };
                }
            }
        }
        // overwrite the storage with the provided heartbeats
        async overwrite(heartbeatsObject) {
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return;
            }
            else {
                const existingHeartbeatsObject = await this.read();
                return writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ??
                        existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: heartbeatsObject.heartbeats
                });
            }
        }
        // add heartbeats
        async add(heartbeatsObject) {
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return;
            }
            else {
                const existingHeartbeatsObject = await this.read();
                return writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ??
                        existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: [
                        ...existingHeartbeatsObject.heartbeats,
                        ...heartbeatsObject.heartbeats
                    ]
                });
            }
        }
    }
    /**
     * Calculate bytes of a HeartbeatsByUserAgent array after being wrapped
     * in a platform logging header JSON object, stringified, and converted
     * to base 64.
     */
    function countBytes(heartbeatsCache) {
        // base64 has a restricted set of characters, all of which should be 1 byte.
        return base64urlEncodeWithoutPadding(
        // heartbeatsCache wrapper properties
        JSON.stringify({ version: 2, heartbeats: heartbeatsCache })).length;
    }
    /**
     * Returns the index of the heartbeat with the earliest date.
     * If the heartbeats array is empty, -1 is returned.
     */
    function getEarliestHeartbeatIdx(heartbeats) {
        if (heartbeats.length === 0) {
            return -1;
        }
        let earliestHeartbeatIdx = 0;
        let earliestHeartbeatDate = heartbeats[0].date;
        for (let i = 1; i < heartbeats.length; i++) {
            if (heartbeats[i].date < earliestHeartbeatDate) {
                earliestHeartbeatDate = heartbeats[i].date;
                earliestHeartbeatIdx = i;
            }
        }
        return earliestHeartbeatIdx;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function registerCoreComponents(variant) {
        _registerComponent(new Component('platform-logger', container => new PlatformLoggerServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
        _registerComponent(new Component('heartbeat', container => new HeartbeatServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
        // Register `app` package.
        registerVersion(name$q, version$1$1, variant);
        // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
        registerVersion(name$q, version$1$1, 'esm2020');
        // Register platform SDK identifier (no version).
        registerVersion('fire-js', '');
    }

    /**
     * Firebase App
     *
     * @remarks This package coordinates the communication between the different Firebase components
     * @packageDocumentation
     */
    registerCoreComponents('');

    var name$1 = "firebase";
    var version$1 = "12.14.0";

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    registerVersion(name$1, version$1, 'app');

    function _prodErrorMap() {
        // We will include this one message in the prod error map since by the very
        // nature of this error, developers will never be able to see the message
        // using the debugErrorMap (which is installed during auth initialization).
        return {
            ["dependent-sdk-initialized-before-auth" /* AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH */]: 'Another Firebase SDK was initialized and is trying to use Auth before Auth is ' +
                'initialized. Please be sure to call `initializeAuth` or `getAuth` before ' +
                'starting any other Firebase SDK.'
        };
    }
    /**
     * A minimal error map with all verbose error messages stripped.
     *
     * See discussion at {@link AuthErrorMap}
     *
     * @public
     */
    const prodErrorMap = _prodErrorMap;
    const _DEFAULT_AUTH_ERROR_FACTORY = new ErrorFactory('auth', 'Firebase', _prodErrorMap());

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const logClient = new Logger('@firebase/auth');
    function _logWarn(msg, ...args) {
        if (logClient.logLevel <= LogLevel.WARN) {
            logClient.warn(`Auth (${SDK_VERSION}): ${msg}`, ...args);
        }
    }
    function _logError(msg, ...args) {
        if (logClient.logLevel <= LogLevel.ERROR) {
            logClient.error(`Auth (${SDK_VERSION}): ${msg}`, ...args);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _fail(authOrCode, ...rest) {
        throw createErrorInternal(authOrCode, ...rest);
    }
    function _createError(authOrCode, ...rest) {
        return createErrorInternal(authOrCode, ...rest);
    }
    function _errorWithCustomMessage(auth, code, message) {
        const errorMap = {
            ...prodErrorMap(),
            [code]: message
        };
        const factory = new ErrorFactory('auth', 'Firebase', errorMap);
        return factory.create(code, {
            appName: auth.name
        });
    }
    function _serverAppCurrentUserOperationNotSupportedError(auth) {
        return _errorWithCustomMessage(auth, "operation-not-supported-in-this-environment" /* AuthErrorCode.OPERATION_NOT_SUPPORTED */, 'Operations that alter the current user are not supported in conjunction with FirebaseServerApp');
    }
    function createErrorInternal(authOrCode, ...rest) {
        if (typeof authOrCode !== 'string') {
            const code = rest[0];
            const fullParams = [...rest.slice(1)];
            if (fullParams[0]) {
                fullParams[0].appName = authOrCode.name;
            }
            return authOrCode._errorFactory.create(code, ...fullParams);
        }
        return _DEFAULT_AUTH_ERROR_FACTORY.create(authOrCode, ...rest);
    }
    function _assert(assertion, authOrCode, ...rest) {
        if (!assertion) {
            throw createErrorInternal(authOrCode, ...rest);
        }
    }
    /**
     * Unconditionally fails, throwing an internal error with the given message.
     *
     * @param failure type of failure encountered
     * @throws Error
     */
    function debugFail(failure) {
        // Log the failure in addition to throw an exception, just in case the
        // exception is swallowed.
        const message = `INTERNAL ASSERTION FAILED: ` + failure;
        _logError(message);
        // NOTE: We don't use FirebaseError here because these are internal failures
        // that cannot be handled by the user. (Also it would create a circular
        // dependency between the error and assert modules which doesn't work.)
        throw new Error(message);
    }
    /**
     * Fails if the given assertion condition is false, throwing an Error with the
     * given message if it did.
     *
     * @param assertion
     * @param message
     */
    function debugAssert(assertion, message) {
        if (!assertion) {
            debugFail(message);
        }
    }
    function _isHttpOrHttps() {
        return _getCurrentScheme() === 'http:' || _getCurrentScheme() === 'https:';
    }
    function _getCurrentScheme() {
        return (typeof self !== 'undefined' && self.location?.protocol) || null;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Determine whether the browser is working online
     */
    function _isOnline() {
        if (typeof navigator !== 'undefined' &&
            navigator &&
            'onLine' in navigator &&
            typeof navigator.onLine === 'boolean' &&
            // Apply only for traditional web apps and Chrome extensions.
            // This is especially true for Cordova apps which have unreliable
            // navigator.onLine behavior unless cordova-plugin-network-information is
            // installed which overwrites the native navigator.onLine value and
            // defines navigator.connection.
            (_isHttpOrHttps() || isBrowserExtension() || 'connection' in navigator)) {
            return navigator.onLine;
        }
        // If we can't determine the state, assume it is online.
        return true;
    }
    function _getUserLanguage() {
        if (typeof navigator === 'undefined') {
            return null;
        }
        const navigatorLanguage = navigator;
        return (
        // Most reliable, but only supported in Chrome/Firefox.
        (navigatorLanguage.languages && navigatorLanguage.languages[0]) ||
            // Supported in most browsers, but returns the language of the browser
            // UI, not the language set in browser settings.
            navigatorLanguage.language ||
            // Couldn't determine language.
            null);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A structure to help pick between a range of long and short delay durations
     * depending on the current environment. In general, the long delay is used for
     * mobile environments whereas short delays are used for desktop environments.
     */
    class Delay {
        constructor(shortDelay, longDelay) {
            this.shortDelay = shortDelay;
            this.longDelay = longDelay;
            // Internal error when improperly initialized.
            debugAssert(longDelay > shortDelay, 'Short delay should be less than long delay!');
            this.isMobile = isMobileCordova() || isReactNative();
        }
        get() {
            if (!_isOnline()) {
                // Pick the shorter timeout.
                return Math.min(5000 /* DelayMin.OFFLINE */, this.shortDelay);
            }
            // If running in a mobile environment, return the long delay, otherwise
            // return the short delay.
            // This could be improved in the future to dynamically change based on other
            // variables instead of just reading the current environment.
            return this.isMobile ? this.longDelay : this.shortDelay;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _emulatorUrl(config, path) {
        debugAssert(config.emulator, 'Emulator should always be set here');
        const { url } = config.emulator;
        if (!path) {
            return url;
        }
        return `${url}${path.startsWith('/') ? path.slice(1) : path}`;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class FetchProvider {
        static initialize(fetchImpl, headersImpl, responseImpl) {
            this.fetchImpl = fetchImpl;
            if (headersImpl) {
                this.headersImpl = headersImpl;
            }
            if (responseImpl) {
                this.responseImpl = responseImpl;
            }
        }
        static fetch() {
            if (this.fetchImpl) {
                return this.fetchImpl;
            }
            if (typeof self !== 'undefined' && 'fetch' in self) {
                return self.fetch;
            }
            if (typeof globalThis !== 'undefined' && globalThis.fetch) {
                return globalThis.fetch;
            }
            if (typeof fetch !== 'undefined') {
                return fetch;
            }
            debugFail('Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
        }
        static headers() {
            if (this.headersImpl) {
                return this.headersImpl;
            }
            if (typeof self !== 'undefined' && 'Headers' in self) {
                return self.Headers;
            }
            if (typeof globalThis !== 'undefined' && globalThis.Headers) {
                return globalThis.Headers;
            }
            if (typeof Headers !== 'undefined') {
                return Headers;
            }
            debugFail('Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
        }
        static response() {
            if (this.responseImpl) {
                return this.responseImpl;
            }
            if (typeof self !== 'undefined' && 'Response' in self) {
                return self.Response;
            }
            if (typeof globalThis !== 'undefined' && globalThis.Response) {
                return globalThis.Response;
            }
            if (typeof Response !== 'undefined') {
                return Response;
            }
            debugFail('Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Map from errors returned by the server to errors to developer visible errors
     */
    const SERVER_ERROR_MAP = {
        // Custom token errors.
        ["CREDENTIAL_MISMATCH" /* ServerError.CREDENTIAL_MISMATCH */]: "custom-token-mismatch" /* AuthErrorCode.CREDENTIAL_MISMATCH */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_CUSTOM_TOKEN" /* ServerError.MISSING_CUSTOM_TOKEN */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Create Auth URI errors.
        ["INVALID_IDENTIFIER" /* ServerError.INVALID_IDENTIFIER */]: "invalid-email" /* AuthErrorCode.INVALID_EMAIL */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_CONTINUE_URI" /* ServerError.MISSING_CONTINUE_URI */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Sign in with email and password errors (some apply to sign up too).
        ["INVALID_PASSWORD" /* ServerError.INVALID_PASSWORD */]: "wrong-password" /* AuthErrorCode.INVALID_PASSWORD */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_PASSWORD" /* ServerError.MISSING_PASSWORD */]: "missing-password" /* AuthErrorCode.MISSING_PASSWORD */,
        // Thrown if Email Enumeration Protection is enabled in the project and the email or password is
        // invalid.
        ["INVALID_LOGIN_CREDENTIALS" /* ServerError.INVALID_LOGIN_CREDENTIALS */]: "invalid-credential" /* AuthErrorCode.INVALID_CREDENTIAL */,
        // Sign up with email and password errors.
        ["EMAIL_EXISTS" /* ServerError.EMAIL_EXISTS */]: "email-already-in-use" /* AuthErrorCode.EMAIL_EXISTS */,
        ["PASSWORD_LOGIN_DISABLED" /* ServerError.PASSWORD_LOGIN_DISABLED */]: "operation-not-allowed" /* AuthErrorCode.OPERATION_NOT_ALLOWED */,
        // Verify assertion for sign in with credential errors:
        ["INVALID_IDP_RESPONSE" /* ServerError.INVALID_IDP_RESPONSE */]: "invalid-credential" /* AuthErrorCode.INVALID_CREDENTIAL */,
        ["INVALID_PENDING_TOKEN" /* ServerError.INVALID_PENDING_TOKEN */]: "invalid-credential" /* AuthErrorCode.INVALID_CREDENTIAL */,
        ["FEDERATED_USER_ID_ALREADY_LINKED" /* ServerError.FEDERATED_USER_ID_ALREADY_LINKED */]: "credential-already-in-use" /* AuthErrorCode.CREDENTIAL_ALREADY_IN_USE */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_REQ_TYPE" /* ServerError.MISSING_REQ_TYPE */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Send Password reset email errors:
        ["EMAIL_NOT_FOUND" /* ServerError.EMAIL_NOT_FOUND */]: "user-not-found" /* AuthErrorCode.USER_DELETED */,
        ["RESET_PASSWORD_EXCEED_LIMIT" /* ServerError.RESET_PASSWORD_EXCEED_LIMIT */]: "too-many-requests" /* AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER */,
        ["EXPIRED_OOB_CODE" /* ServerError.EXPIRED_OOB_CODE */]: "expired-action-code" /* AuthErrorCode.EXPIRED_OOB_CODE */,
        ["INVALID_OOB_CODE" /* ServerError.INVALID_OOB_CODE */]: "invalid-action-code" /* AuthErrorCode.INVALID_OOB_CODE */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_OOB_CODE" /* ServerError.MISSING_OOB_CODE */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Operations that require ID token in request:
        ["CREDENTIAL_TOO_OLD_LOGIN_AGAIN" /* ServerError.CREDENTIAL_TOO_OLD_LOGIN_AGAIN */]: "requires-recent-login" /* AuthErrorCode.CREDENTIAL_TOO_OLD_LOGIN_AGAIN */,
        ["INVALID_ID_TOKEN" /* ServerError.INVALID_ID_TOKEN */]: "invalid-user-token" /* AuthErrorCode.INVALID_AUTH */,
        ["TOKEN_EXPIRED" /* ServerError.TOKEN_EXPIRED */]: "user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */,
        ["USER_NOT_FOUND" /* ServerError.USER_NOT_FOUND */]: "user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */,
        // Other errors.
        ["TOO_MANY_ATTEMPTS_TRY_LATER" /* ServerError.TOO_MANY_ATTEMPTS_TRY_LATER */]: "too-many-requests" /* AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER */,
        ["PASSWORD_DOES_NOT_MEET_REQUIREMENTS" /* ServerError.PASSWORD_DOES_NOT_MEET_REQUIREMENTS */]: "password-does-not-meet-requirements" /* AuthErrorCode.PASSWORD_DOES_NOT_MEET_REQUIREMENTS */,
        // Phone Auth related errors.
        ["INVALID_CODE" /* ServerError.INVALID_CODE */]: "invalid-verification-code" /* AuthErrorCode.INVALID_CODE */,
        ["INVALID_SESSION_INFO" /* ServerError.INVALID_SESSION_INFO */]: "invalid-verification-id" /* AuthErrorCode.INVALID_SESSION_INFO */,
        ["INVALID_TEMPORARY_PROOF" /* ServerError.INVALID_TEMPORARY_PROOF */]: "invalid-credential" /* AuthErrorCode.INVALID_CREDENTIAL */,
        ["MISSING_SESSION_INFO" /* ServerError.MISSING_SESSION_INFO */]: "missing-verification-id" /* AuthErrorCode.MISSING_SESSION_INFO */,
        ["SESSION_EXPIRED" /* ServerError.SESSION_EXPIRED */]: "code-expired" /* AuthErrorCode.CODE_EXPIRED */,
        // Other action code errors when additional settings passed.
        // MISSING_CONTINUE_URI is getting mapped to INTERNAL_ERROR above.
        // This is OK as this error will be caught by client side validation.
        ["MISSING_ANDROID_PACKAGE_NAME" /* ServerError.MISSING_ANDROID_PACKAGE_NAME */]: "missing-android-pkg-name" /* AuthErrorCode.MISSING_ANDROID_PACKAGE_NAME */,
        ["UNAUTHORIZED_DOMAIN" /* ServerError.UNAUTHORIZED_DOMAIN */]: "unauthorized-continue-uri" /* AuthErrorCode.UNAUTHORIZED_DOMAIN */,
        // getProjectConfig errors when clientId is passed.
        ["INVALID_OAUTH_CLIENT_ID" /* ServerError.INVALID_OAUTH_CLIENT_ID */]: "invalid-oauth-client-id" /* AuthErrorCode.INVALID_OAUTH_CLIENT_ID */,
        // User actions (sign-up or deletion) disabled errors.
        ["ADMIN_ONLY_OPERATION" /* ServerError.ADMIN_ONLY_OPERATION */]: "admin-restricted-operation" /* AuthErrorCode.ADMIN_ONLY_OPERATION */,
        // Multi factor related errors.
        ["INVALID_MFA_PENDING_CREDENTIAL" /* ServerError.INVALID_MFA_PENDING_CREDENTIAL */]: "invalid-multi-factor-session" /* AuthErrorCode.INVALID_MFA_SESSION */,
        ["MFA_ENROLLMENT_NOT_FOUND" /* ServerError.MFA_ENROLLMENT_NOT_FOUND */]: "multi-factor-info-not-found" /* AuthErrorCode.MFA_INFO_NOT_FOUND */,
        ["MISSING_MFA_ENROLLMENT_ID" /* ServerError.MISSING_MFA_ENROLLMENT_ID */]: "missing-multi-factor-info" /* AuthErrorCode.MISSING_MFA_INFO */,
        ["MISSING_MFA_PENDING_CREDENTIAL" /* ServerError.MISSING_MFA_PENDING_CREDENTIAL */]: "missing-multi-factor-session" /* AuthErrorCode.MISSING_MFA_SESSION */,
        ["SECOND_FACTOR_EXISTS" /* ServerError.SECOND_FACTOR_EXISTS */]: "second-factor-already-in-use" /* AuthErrorCode.SECOND_FACTOR_ALREADY_ENROLLED */,
        ["SECOND_FACTOR_LIMIT_EXCEEDED" /* ServerError.SECOND_FACTOR_LIMIT_EXCEEDED */]: "maximum-second-factor-count-exceeded" /* AuthErrorCode.SECOND_FACTOR_LIMIT_EXCEEDED */,
        // Blocking functions related errors.
        ["BLOCKING_FUNCTION_ERROR_RESPONSE" /* ServerError.BLOCKING_FUNCTION_ERROR_RESPONSE */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Recaptcha related errors.
        ["RECAPTCHA_NOT_ENABLED" /* ServerError.RECAPTCHA_NOT_ENABLED */]: "recaptcha-not-enabled" /* AuthErrorCode.RECAPTCHA_NOT_ENABLED */,
        ["MISSING_RECAPTCHA_TOKEN" /* ServerError.MISSING_RECAPTCHA_TOKEN */]: "missing-recaptcha-token" /* AuthErrorCode.MISSING_RECAPTCHA_TOKEN */,
        ["INVALID_RECAPTCHA_TOKEN" /* ServerError.INVALID_RECAPTCHA_TOKEN */]: "invalid-recaptcha-token" /* AuthErrorCode.INVALID_RECAPTCHA_TOKEN */,
        ["INVALID_RECAPTCHA_ACTION" /* ServerError.INVALID_RECAPTCHA_ACTION */]: "invalid-recaptcha-action" /* AuthErrorCode.INVALID_RECAPTCHA_ACTION */,
        ["MISSING_CLIENT_TYPE" /* ServerError.MISSING_CLIENT_TYPE */]: "missing-client-type" /* AuthErrorCode.MISSING_CLIENT_TYPE */,
        ["MISSING_RECAPTCHA_VERSION" /* ServerError.MISSING_RECAPTCHA_VERSION */]: "missing-recaptcha-version" /* AuthErrorCode.MISSING_RECAPTCHA_VERSION */,
        ["INVALID_RECAPTCHA_VERSION" /* ServerError.INVALID_RECAPTCHA_VERSION */]: "invalid-recaptcha-version" /* AuthErrorCode.INVALID_RECAPTCHA_VERSION */,
        ["INVALID_REQ_TYPE" /* ServerError.INVALID_REQ_TYPE */]: "invalid-req-type" /* AuthErrorCode.INVALID_REQ_TYPE */
    };

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const CookieAuthProxiedEndpoints = [
        "/v1/accounts:signInWithCustomToken" /* Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN */,
        "/v1/accounts:signInWithEmailLink" /* Endpoint.SIGN_IN_WITH_EMAIL_LINK */,
        "/v1/accounts:signInWithIdp" /* Endpoint.SIGN_IN_WITH_IDP */,
        "/v1/accounts:signInWithPassword" /* Endpoint.SIGN_IN_WITH_PASSWORD */,
        "/v1/accounts:signInWithPhoneNumber" /* Endpoint.SIGN_IN_WITH_PHONE_NUMBER */,
        "/v1/token" /* Endpoint.TOKEN */
    ];
    const DEFAULT_API_TIMEOUT_MS = new Delay(30000, 60000);
    function _addTidIfNecessary(auth, request) {
        if (auth.tenantId && !request.tenantId) {
            return {
                ...request,
                tenantId: auth.tenantId
            };
        }
        return request;
    }
    async function _performApiRequest(auth, method, path, request, customErrorMap = {}) {
        return _performFetchWithErrorHandling(auth, customErrorMap, async () => {
            let body = {};
            let params = {};
            if (request) {
                if (method === "GET" /* HttpMethod.GET */) {
                    params = request;
                }
                else {
                    body = {
                        body: JSON.stringify(request)
                    };
                }
            }
            const query = querystring({
                key: auth.config.apiKey,
                ...params
            }).slice(1);
            const headers = await auth._getAdditionalHeaders();
            headers["Content-Type" /* HttpHeader.CONTENT_TYPE */] = 'application/json';
            if (auth.languageCode) {
                headers["X-Firebase-Locale" /* HttpHeader.X_FIREBASE_LOCALE */] = auth.languageCode;
            }
            const fetchArgs = {
                method,
                headers,
                ...body
            };
            /* Security-conscious server-side frameworks tend to have built in mitigations for referrer
               problems". See the Cloudflare GitHub issue #487: Error: The 'referrerPolicy' field on
               'RequestInitializerDict' is not implemented."
               https://github.com/cloudflare/next-on-pages/issues/487 */
            if (!isCloudflareWorker()) {
                fetchArgs.referrerPolicy = 'no-referrer';
            }
            if (auth.emulatorConfig && isCloudWorkstation(auth.emulatorConfig.host)) {
                fetchArgs.credentials = 'include';
            }
            return FetchProvider.fetch()(await _getFinalTarget(auth, auth.config.apiHost, path, query), fetchArgs);
        });
    }
    async function _performFetchWithErrorHandling(auth, customErrorMap, fetchFn) {
        auth._canInitEmulator = false;
        const errorMap = { ...SERVER_ERROR_MAP, ...customErrorMap };
        try {
            const networkTimeout = new NetworkTimeout(auth);
            const response = await Promise.race([
                fetchFn(),
                networkTimeout.promise
            ]);
            // If we've reached this point, the fetch succeeded and the networkTimeout
            // didn't throw; clear the network timeout delay so that Node won't hang
            networkTimeout.clearNetworkTimeout();
            const json = await response.json();
            if ('needConfirmation' in json) {
                throw _makeTaggedError(auth, "account-exists-with-different-credential" /* AuthErrorCode.NEED_CONFIRMATION */, json);
            }
            if (response.ok && !('errorMessage' in json)) {
                return json;
            }
            else {
                const errorMessage = response.ok ? json.errorMessage : json.error.message;
                const [serverErrorCode, serverErrorMessage] = errorMessage.split(' : ');
                if (serverErrorCode === "FEDERATED_USER_ID_ALREADY_LINKED" /* ServerError.FEDERATED_USER_ID_ALREADY_LINKED */) {
                    throw _makeTaggedError(auth, "credential-already-in-use" /* AuthErrorCode.CREDENTIAL_ALREADY_IN_USE */, json);
                }
                else if (serverErrorCode === "EMAIL_EXISTS" /* ServerError.EMAIL_EXISTS */) {
                    throw _makeTaggedError(auth, "email-already-in-use" /* AuthErrorCode.EMAIL_EXISTS */, json);
                }
                else if (serverErrorCode === "USER_DISABLED" /* ServerError.USER_DISABLED */) {
                    throw _makeTaggedError(auth, "user-disabled" /* AuthErrorCode.USER_DISABLED */, json);
                }
                const authError = errorMap[serverErrorCode] ||
                    serverErrorCode
                        .toLowerCase()
                        .replace(/[_\s]+/g, '-');
                if (serverErrorMessage) {
                    throw _errorWithCustomMessage(auth, authError, serverErrorMessage);
                }
                else {
                    _fail(auth, authError);
                }
            }
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                throw e;
            }
            // Changing this to a different error code will log user out when there is a network error
            // because we treat any error other than NETWORK_REQUEST_FAILED as token is invalid.
            // https://github.com/firebase/firebase-js-sdk/blob/4fbc73610d70be4e0852e7de63a39cb7897e8546/packages/auth/src/core/auth/auth_impl.ts#L309-L316
            _fail(auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */, { 'message': String(e) });
        }
    }
    async function _getFinalTarget(auth, host, path, query) {
        const base = `${host}${path}?${query}`;
        const authInternal = auth;
        const finalTarget = authInternal.config.emulator
            ? _emulatorUrl(auth.config, base)
            : `${auth.config.apiScheme}://${base}`;
        // Cookie auth works by MiTMing the signIn and token endpoints from the developer's backend,
        // saving the idToken and refreshToken into cookies, and then redacting the refreshToken
        // from the response
        if (CookieAuthProxiedEndpoints.includes(path)) {
            // Persistence manager is async, we need to await it. We can't just wait for auth initialized
            // here since auth initialization calls this function.
            await authInternal._persistenceManagerAvailable;
            if (authInternal._getPersistenceType() === "COOKIE" /* PersistenceType.COOKIE */) {
                const cookiePersistence = authInternal._getPersistence();
                return cookiePersistence._getFinalTarget(finalTarget).toString();
            }
        }
        return finalTarget;
    }
    class NetworkTimeout {
        clearNetworkTimeout() {
            clearTimeout(this.timer);
        }
        constructor(auth) {
            this.auth = auth;
            // Node timers and browser timers are fundamentally incompatible, but we
            // don't care about the value here
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.timer = null;
            this.promise = new Promise((_, reject) => {
                this.timer = setTimeout(() => {
                    return reject(_createError(this.auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */));
                }, DEFAULT_API_TIMEOUT_MS.get());
            });
        }
    }
    function _makeTaggedError(auth, code, response) {
        const errorParams = {
            appName: auth.name
        };
        if (response.email) {
            errorParams.email = response.email;
        }
        if (response.phoneNumber) {
            errorParams.phoneNumber = response.phoneNumber;
        }
        const error = _createError(auth, code, errorParams);
        // We know customData is defined on error because errorParams is defined
        error.customData._tokenResponse = response;
        return error;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function deleteAccount(auth, request) {
        return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:delete" /* Endpoint.DELETE_ACCOUNT */, request);
    }
    async function getAccountInfo(auth, request) {
        return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:lookup" /* Endpoint.GET_ACCOUNT_INFO */, request);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function utcTimestampToDateString(utcTimestamp) {
        if (!utcTimestamp) {
            return undefined;
        }
        try {
            // Convert to date object.
            const date = new Date(Number(utcTimestamp));
            // Test date is valid.
            if (!isNaN(date.getTime())) {
                // Convert to UTC date string.
                return date.toUTCString();
            }
        }
        catch (e) {
            // Do nothing. undefined will be returned.
        }
        return undefined;
    }
    /**
     * Returns a deserialized JSON Web Token (JWT) used to identify the user to a Firebase service.
     *
     * @remarks
     * Returns the current token if it has not expired or if it will not expire in the next five
     * minutes. Otherwise, this will refresh the token and return a new one.
     *
     * @param user - The user.
     * @param forceRefresh - Force refresh regardless of token expiration.
     *
     * @public
     */
    async function getIdTokenResult(user, forceRefresh = false) {
        const userInternal = getModularInstance(user);
        const token = await userInternal.getIdToken(forceRefresh);
        const claims = _parseToken(token);
        _assert(claims && claims.exp && claims.auth_time && claims.iat, userInternal.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        const firebase = typeof claims.firebase === 'object' ? claims.firebase : undefined;
        const signInProvider = firebase?.['sign_in_provider'];
        return {
            claims,
            token,
            authTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.auth_time)),
            issuedAtTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.iat)),
            expirationTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.exp)),
            signInProvider: signInProvider || null,
            signInSecondFactor: firebase?.['sign_in_second_factor'] || null
        };
    }
    function secondsStringToMilliseconds(seconds) {
        return Number(seconds) * 1000;
    }
    function _parseToken(token) {
        const [algorithm, payload, signature] = token.split('.');
        if (algorithm === undefined ||
            payload === undefined ||
            signature === undefined) {
            _logError('JWT malformed, contained fewer than 3 sections');
            return null;
        }
        try {
            const decoded = base64Decode(payload);
            if (!decoded) {
                _logError('Failed to decode base64 JWT payload');
                return null;
            }
            return JSON.parse(decoded);
        }
        catch (e) {
            _logError('Caught error parsing JWT payload as JSON', e?.toString());
            return null;
        }
    }
    /**
     * Extract expiresIn TTL from a token by subtracting the expiration from the issuance.
     */
    function _tokenExpiresIn(token) {
        const parsedToken = _parseToken(token);
        _assert(parsedToken, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        _assert(typeof parsedToken.exp !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        _assert(typeof parsedToken.iat !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        return Number(parsedToken.exp) - Number(parsedToken.iat);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function _logoutIfInvalidated(user, promise, bypassAuthState = false) {
        if (bypassAuthState) {
            return promise;
        }
        try {
            return await promise;
        }
        catch (e) {
            if (e instanceof FirebaseError && isUserInvalidated(e)) {
                if (user.auth.currentUser === user) {
                    await user.auth.signOut();
                }
            }
            throw e;
        }
    }
    function isUserInvalidated({ code }) {
        return (code === `auth/${"user-disabled" /* AuthErrorCode.USER_DISABLED */}` ||
            code === `auth/${"user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */}`);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class ProactiveRefresh {
        constructor(user) {
            this.user = user;
            this.isRunning = false;
            // Node timers and browser timers return fundamentally different types.
            // We don't actually care what the value is but TS won't accept unknown and
            // we can't cast properly in both environments.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.timerId = null;
            this.errorBackoff = 30000 /* Duration.RETRY_BACKOFF_MIN */;
        }
        _start() {
            if (this.isRunning) {
                return;
            }
            this.isRunning = true;
            this.schedule();
        }
        _stop() {
            if (!this.isRunning) {
                return;
            }
            this.isRunning = false;
            if (this.timerId !== null) {
                clearTimeout(this.timerId);
            }
        }
        getInterval(wasError) {
            if (wasError) {
                const interval = this.errorBackoff;
                this.errorBackoff = Math.min(this.errorBackoff * 2, 960000 /* Duration.RETRY_BACKOFF_MAX */);
                return interval;
            }
            else {
                // Reset the error backoff
                this.errorBackoff = 30000 /* Duration.RETRY_BACKOFF_MIN */;
                const expTime = this.user.stsTokenManager.expirationTime ?? 0;
                const interval = expTime - Date.now() - 300000 /* Duration.OFFSET */;
                return Math.max(0, interval);
            }
        }
        schedule(wasError = false) {
            if (!this.isRunning) {
                // Just in case...
                return;
            }
            const interval = this.getInterval(wasError);
            this.timerId = setTimeout(async () => {
                await this.iteration();
            }, interval);
        }
        async iteration() {
            try {
                await this.user.getIdToken(true);
            }
            catch (e) {
                // Only retry on network errors
                if (e?.code ===
                    `auth/${"network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */}`) {
                    this.schedule(/* wasError */ true);
                }
                return;
            }
            this.schedule();
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class UserMetadata {
        constructor(createdAt, lastLoginAt) {
            this.createdAt = createdAt;
            this.lastLoginAt = lastLoginAt;
            this._initializeTime();
        }
        _initializeTime() {
            this.lastSignInTime = utcTimestampToDateString(this.lastLoginAt);
            this.creationTime = utcTimestampToDateString(this.createdAt);
        }
        _copy(metadata) {
            this.createdAt = metadata.createdAt;
            this.lastLoginAt = metadata.lastLoginAt;
            this._initializeTime();
        }
        toJSON() {
            return {
                createdAt: this.createdAt,
                lastLoginAt: this.lastLoginAt
            };
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function _reloadWithoutSaving(user) {
        const auth = user.auth;
        const idToken = await user.getIdToken();
        const response = await _logoutIfInvalidated(user, getAccountInfo(auth, { idToken }));
        _assert(response?.users.length, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        const coreAccount = response.users[0];
        user._notifyReloadListener(coreAccount);
        const newProviderData = coreAccount.providerUserInfo?.length
            ? extractProviderData(coreAccount.providerUserInfo)
            : [];
        const providerData = mergeProviderData(user.providerData, newProviderData);
        // Preserves the non-nonymous status of the stored user, even if no more
        // credentials (federated or email/password) are linked to the user. If
        // the user was previously anonymous, then use provider data to update.
        // On the other hand, if it was not anonymous before, it should never be
        // considered anonymous now.
        const oldIsAnonymous = user.isAnonymous;
        const newIsAnonymous = !(user.email && coreAccount.passwordHash) && !providerData?.length;
        const isAnonymous = !oldIsAnonymous ? false : newIsAnonymous;
        const updates = {
            uid: coreAccount.localId,
            displayName: coreAccount.displayName || null,
            photoURL: coreAccount.photoUrl || null,
            email: coreAccount.email || null,
            emailVerified: coreAccount.emailVerified || false,
            phoneNumber: coreAccount.phoneNumber || null,
            tenantId: coreAccount.tenantId || null,
            providerData,
            metadata: new UserMetadata(coreAccount.createdAt, coreAccount.lastLoginAt),
            isAnonymous
        };
        Object.assign(user, updates);
    }
    /**
     * Reloads user account data, if signed in.
     *
     * @param user - The user.
     *
     * @public
     */
    async function reload(user) {
        const userInternal = getModularInstance(user);
        await _reloadWithoutSaving(userInternal);
        // Even though the current user hasn't changed, update
        // current user will trigger a persistence update w/ the
        // new info.
        await userInternal.auth._persistUserIfCurrent(userInternal);
        userInternal.auth._notifyListenersIfCurrent(userInternal);
    }
    function mergeProviderData(original, newData) {
        const deduped = original.filter(o => !newData.some(n => n.providerId === o.providerId));
        return [...deduped, ...newData];
    }
    function extractProviderData(providers) {
        return providers.map(({ providerId, ...provider }) => {
            return {
                providerId,
                uid: provider.rawId || '',
                displayName: provider.displayName || null,
                email: provider.email || null,
                phoneNumber: provider.phoneNumber || null,
                photoURL: provider.photoUrl || null
            };
        });
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function requestStsToken(auth, refreshToken) {
        const response = await _performFetchWithErrorHandling(auth, {}, async () => {
            const body = querystring({
                'grant_type': 'refresh_token',
                'refresh_token': refreshToken
            }).slice(1);
            const { tokenApiHost, apiKey } = auth.config;
            const url = await _getFinalTarget(auth, tokenApiHost, "/v1/token" /* Endpoint.TOKEN */, `key=${apiKey}`);
            const headers = await auth._getAdditionalHeaders();
            headers["Content-Type" /* HttpHeader.CONTENT_TYPE */] = 'application/x-www-form-urlencoded';
            const options = {
                method: "POST" /* HttpMethod.POST */,
                headers,
                body
            };
            if (auth.emulatorConfig &&
                isCloudWorkstation(auth.emulatorConfig.host)) {
                options.credentials = 'include';
            }
            return FetchProvider.fetch()(url, options);
        });
        // The response comes back in snake_case. Convert to camel:
        return {
            accessToken: response.access_token,
            expiresIn: response.expires_in,
            refreshToken: response.refresh_token
        };
    }
    async function revokeToken(auth, request) {
        return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v2/accounts:revokeToken" /* Endpoint.REVOKE_TOKEN */, _addTidIfNecessary(auth, request));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * We need to mark this class as internal explicitly to exclude it in the public typings, because
     * it references AuthInternal which has a circular dependency with UserInternal.
     *
     * @internal
     */
    class StsTokenManager {
        constructor() {
            this.refreshToken = null;
            this.accessToken = null;
            this.expirationTime = null;
        }
        get isExpired() {
            return (!this.expirationTime ||
                Date.now() > this.expirationTime - 30000 /* Buffer.TOKEN_REFRESH */);
        }
        updateFromServerResponse(response) {
            _assert(response.idToken, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            _assert(typeof response.idToken !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            _assert(typeof response.refreshToken !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const expiresIn = 'expiresIn' in response && typeof response.expiresIn !== 'undefined'
                ? Number(response.expiresIn)
                : _tokenExpiresIn(response.idToken);
            this.updateTokensAndExpiration(response.idToken, response.refreshToken, expiresIn);
        }
        updateFromIdToken(idToken) {
            _assert(idToken.length !== 0, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const expiresIn = _tokenExpiresIn(idToken);
            this.updateTokensAndExpiration(idToken, null, expiresIn);
        }
        async getToken(auth, forceRefresh = false) {
            if (!forceRefresh && this.accessToken && !this.isExpired) {
                return this.accessToken;
            }
            _assert(this.refreshToken, auth, "user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */);
            if (this.refreshToken) {
                await this.refresh(auth, this.refreshToken);
                return this.accessToken;
            }
            return null;
        }
        clearRefreshToken() {
            this.refreshToken = null;
        }
        async refresh(auth, oldToken) {
            const { accessToken, refreshToken, expiresIn } = await requestStsToken(auth, oldToken);
            this.updateTokensAndExpiration(accessToken, refreshToken, Number(expiresIn));
        }
        updateTokensAndExpiration(accessToken, refreshToken, expiresInSec) {
            this.refreshToken = refreshToken || null;
            this.accessToken = accessToken || null;
            this.expirationTime = Date.now() + expiresInSec * 1000;
        }
        static fromJSON(appName, object) {
            const { refreshToken, accessToken, expirationTime } = object;
            const manager = new StsTokenManager();
            if (refreshToken) {
                _assert(typeof refreshToken === 'string', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
                    appName
                });
                manager.refreshToken = refreshToken;
            }
            if (accessToken) {
                _assert(typeof accessToken === 'string', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
                    appName
                });
                manager.accessToken = accessToken;
            }
            if (expirationTime) {
                _assert(typeof expirationTime === 'number', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
                    appName
                });
                manager.expirationTime = expirationTime;
            }
            return manager;
        }
        toJSON() {
            return {
                refreshToken: this.refreshToken,
                accessToken: this.accessToken,
                expirationTime: this.expirationTime
            };
        }
        _assign(stsTokenManager) {
            this.accessToken = stsTokenManager.accessToken;
            this.refreshToken = stsTokenManager.refreshToken;
            this.expirationTime = stsTokenManager.expirationTime;
        }
        _clone() {
            return Object.assign(new StsTokenManager(), this.toJSON());
        }
        _performRefresh() {
            return debugFail('not implemented');
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function assertStringOrUndefined(assertion, appName) {
        _assert(typeof assertion === 'string' || typeof assertion === 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, { appName });
    }
    class UserImpl {
        constructor({ uid, auth, stsTokenManager, ...opt }) {
            // For the user object, provider is always Firebase.
            this.providerId = "firebase" /* ProviderId.FIREBASE */;
            this.proactiveRefresh = new ProactiveRefresh(this);
            this.reloadUserInfo = null;
            this.reloadListener = null;
            this.uid = uid;
            this.auth = auth;
            this.stsTokenManager = stsTokenManager;
            this.accessToken = stsTokenManager.accessToken;
            this.displayName = opt.displayName || null;
            this.email = opt.email || null;
            this.emailVerified = opt.emailVerified || false;
            this.phoneNumber = opt.phoneNumber || null;
            this.photoURL = opt.photoURL || null;
            this.isAnonymous = opt.isAnonymous || false;
            this.tenantId = opt.tenantId || null;
            this.providerData = opt.providerData ? [...opt.providerData] : [];
            this.metadata = new UserMetadata(opt.createdAt || undefined, opt.lastLoginAt || undefined);
        }
        async getIdToken(forceRefresh) {
            const accessToken = await _logoutIfInvalidated(this, this.stsTokenManager.getToken(this.auth, forceRefresh));
            _assert(accessToken, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            if (this.accessToken !== accessToken) {
                this.accessToken = accessToken;
                await this.auth._persistUserIfCurrent(this);
                this.auth._notifyListenersIfCurrent(this);
            }
            return accessToken;
        }
        getIdTokenResult(forceRefresh) {
            return getIdTokenResult(this, forceRefresh);
        }
        reload() {
            return reload(this);
        }
        _assign(user) {
            if (this === user) {
                return;
            }
            _assert(this.uid === user.uid, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            this.displayName = user.displayName;
            this.photoURL = user.photoURL;
            this.email = user.email;
            this.emailVerified = user.emailVerified;
            this.phoneNumber = user.phoneNumber;
            this.isAnonymous = user.isAnonymous;
            this.tenantId = user.tenantId;
            this.providerData = user.providerData.map(userInfo => ({ ...userInfo }));
            this.metadata._copy(user.metadata);
            this.stsTokenManager._assign(user.stsTokenManager);
        }
        _clone(auth) {
            const newUser = new UserImpl({
                ...this,
                auth,
                stsTokenManager: this.stsTokenManager._clone()
            });
            newUser.metadata._copy(this.metadata);
            return newUser;
        }
        _onReload(callback) {
            // There should only ever be one listener, and that is a single instance of MultiFactorUser
            _assert(!this.reloadListener, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            this.reloadListener = callback;
            if (this.reloadUserInfo) {
                this._notifyReloadListener(this.reloadUserInfo);
                this.reloadUserInfo = null;
            }
        }
        _notifyReloadListener(userInfo) {
            if (this.reloadListener) {
                this.reloadListener(userInfo);
            }
            else {
                // If no listener is subscribed yet, save the result so it's available when they do subscribe
                this.reloadUserInfo = userInfo;
            }
        }
        _startProactiveRefresh() {
            this.proactiveRefresh._start();
        }
        _stopProactiveRefresh() {
            this.proactiveRefresh._stop();
        }
        async _updateTokensIfNecessary(response, reload = false) {
            let tokensRefreshed = false;
            if (response.idToken &&
                response.idToken !== this.stsTokenManager.accessToken) {
                this.stsTokenManager.updateFromServerResponse(response);
                tokensRefreshed = true;
            }
            if (reload) {
                await _reloadWithoutSaving(this);
            }
            await this.auth._persistUserIfCurrent(this);
            if (tokensRefreshed) {
                this.auth._notifyListenersIfCurrent(this);
            }
        }
        async delete() {
            if (_isFirebaseServerApp(this.auth.app)) {
                return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this.auth));
            }
            const idToken = await this.getIdToken();
            await _logoutIfInvalidated(this, deleteAccount(this.auth, { idToken }));
            this.stsTokenManager.clearRefreshToken();
            // TODO: Determine if cancellable-promises are necessary to use in this class so that delete()
            //       cancels pending actions...
            return this.auth.signOut();
        }
        toJSON() {
            return {
                uid: this.uid,
                email: this.email || undefined,
                emailVerified: this.emailVerified,
                displayName: this.displayName || undefined,
                isAnonymous: this.isAnonymous,
                photoURL: this.photoURL || undefined,
                phoneNumber: this.phoneNumber || undefined,
                tenantId: this.tenantId || undefined,
                providerData: this.providerData.map(userInfo => ({ ...userInfo })),
                stsTokenManager: this.stsTokenManager.toJSON(),
                // Redirect event ID must be maintained in case there is a pending
                // redirect event.
                _redirectEventId: this._redirectEventId,
                ...this.metadata.toJSON(),
                // Required for compatibility with the legacy SDK (go/firebase-auth-sdk-persistence-parsing):
                apiKey: this.auth.config.apiKey,
                appName: this.auth.name
                // Missing authDomain will be tolerated by the legacy SDK.
                // stsTokenManager.apiKey isn't actually required (despite the legacy SDK persisting it).
            };
        }
        get refreshToken() {
            return this.stsTokenManager.refreshToken || '';
        }
        static _fromJSON(auth, object) {
            const displayName = object.displayName ?? undefined;
            const email = object.email ?? undefined;
            const phoneNumber = object.phoneNumber ?? undefined;
            const photoURL = object.photoURL ?? undefined;
            const tenantId = object.tenantId ?? undefined;
            const _redirectEventId = object._redirectEventId ?? undefined;
            const createdAt = object.createdAt ?? undefined;
            const lastLoginAt = object.lastLoginAt ?? undefined;
            const { uid, emailVerified, isAnonymous, providerData, stsTokenManager: plainObjectTokenManager } = object;
            _assert(uid && plainObjectTokenManager, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const stsTokenManager = StsTokenManager.fromJSON(this.name, plainObjectTokenManager);
            _assert(typeof uid === 'string', auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            assertStringOrUndefined(displayName, auth.name);
            assertStringOrUndefined(email, auth.name);
            _assert(typeof emailVerified === 'boolean', auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            _assert(typeof isAnonymous === 'boolean', auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            assertStringOrUndefined(phoneNumber, auth.name);
            assertStringOrUndefined(photoURL, auth.name);
            assertStringOrUndefined(tenantId, auth.name);
            assertStringOrUndefined(_redirectEventId, auth.name);
            assertStringOrUndefined(createdAt, auth.name);
            assertStringOrUndefined(lastLoginAt, auth.name);
            const user = new UserImpl({
                uid,
                auth,
                email,
                emailVerified,
                displayName,
                isAnonymous,
                photoURL,
                phoneNumber,
                tenantId,
                stsTokenManager,
                createdAt,
                lastLoginAt
            });
            if (providerData && Array.isArray(providerData)) {
                user.providerData = providerData.map(userInfo => ({ ...userInfo }));
            }
            if (_redirectEventId) {
                user._redirectEventId = _redirectEventId;
            }
            return user;
        }
        /**
         * Initialize a User from an idToken server response
         * @param auth
         * @param idTokenResponse
         */
        static async _fromIdTokenResponse(auth, idTokenResponse, isAnonymous = false) {
            const stsTokenManager = new StsTokenManager();
            stsTokenManager.updateFromServerResponse(idTokenResponse);
            // Initialize the Firebase Auth user.
            const user = new UserImpl({
                uid: idTokenResponse.localId,
                auth,
                stsTokenManager,
                isAnonymous
            });
            // Updates the user info and data and resolves with a user instance.
            await _reloadWithoutSaving(user);
            return user;
        }
        /**
         * Initialize a User from an idToken server response
         * @param auth
         * @param idTokenResponse
         */
        static async _fromGetAccountInfoResponse(auth, response, idToken) {
            const coreAccount = response.users[0];
            _assert(coreAccount.localId !== undefined, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const providerData = coreAccount.providerUserInfo !== undefined
                ? extractProviderData(coreAccount.providerUserInfo)
                : [];
            const isAnonymous = !(coreAccount.email && coreAccount.passwordHash) && !providerData?.length;
            const stsTokenManager = new StsTokenManager();
            stsTokenManager.updateFromIdToken(idToken);
            // Initialize the Firebase Auth user.
            const user = new UserImpl({
                uid: coreAccount.localId,
                auth,
                stsTokenManager,
                isAnonymous
            });
            // update the user with data from the GetAccountInfo response.
            const updates = {
                uid: coreAccount.localId,
                displayName: coreAccount.displayName || null,
                photoURL: coreAccount.photoUrl || null,
                email: coreAccount.email || null,
                emailVerified: coreAccount.emailVerified || false,
                phoneNumber: coreAccount.phoneNumber || null,
                tenantId: coreAccount.tenantId || null,
                providerData,
                metadata: new UserMetadata(coreAccount.createdAt, coreAccount.lastLoginAt),
                isAnonymous: !(coreAccount.email && coreAccount.passwordHash) &&
                    !providerData?.length
            };
            Object.assign(user, updates);
            return user;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const instanceCache = new Map();
    function _getInstance(cls) {
        debugAssert(cls instanceof Function, 'Expected a class definition');
        let instance = instanceCache.get(cls);
        if (instance) {
            debugAssert(instance instanceof cls, 'Instance stored in cache mismatched with class');
            return instance;
        }
        instance = new cls();
        instanceCache.set(cls, instance);
        return instance;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class InMemoryPersistence {
        constructor() {
            this.type = "NONE" /* PersistenceType.NONE */;
            this.storage = {};
        }
        async _isAvailable() {
            return true;
        }
        async _set(key, value) {
            this.storage[key] = value;
        }
        async _get(key) {
            const value = this.storage[key];
            return value === undefined ? null : value;
        }
        async _remove(key) {
            delete this.storage[key];
        }
        _addListener(_key, _listener) {
            // Listeners are not supported for in-memory storage since it cannot be shared across windows/workers
            return;
        }
        _removeListener(_key, _listener) {
            // Listeners are not supported for in-memory storage since it cannot be shared across windows/workers
            return;
        }
    }
    InMemoryPersistence.type = 'NONE';
    /**
     * An implementation of {@link Persistence} of type 'NONE'.
     *
     * @public
     */
    const inMemoryPersistence = InMemoryPersistence;

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _persistenceKeyName(key, apiKey, appName) {
        return `${"firebase" /* Namespace.PERSISTENCE */}:${key}:${apiKey}:${appName}`;
    }
    class PersistenceUserManager {
        constructor(persistence, auth, userKey) {
            this.persistence = persistence;
            this.auth = auth;
            this.userKey = userKey;
            const { config, name } = this.auth;
            this.fullUserKey = _persistenceKeyName(this.userKey, config.apiKey, name);
            this.fullPersistenceKey = _persistenceKeyName("persistence" /* KeyName.PERSISTENCE_USER */, config.apiKey, name);
            this.boundEventHandler = auth._onStorageEvent.bind(auth);
            this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
        }
        setCurrentUser(user) {
            return this.persistence._set(this.fullUserKey, user.toJSON());
        }
        async getCurrentUser() {
            const blob = await this.persistence._get(this.fullUserKey);
            if (!blob) {
                return null;
            }
            if (typeof blob === 'string') {
                const response = await getAccountInfo(this.auth, { idToken: blob }).catch(() => undefined);
                if (!response) {
                    return null;
                }
                return UserImpl._fromGetAccountInfoResponse(this.auth, response, blob);
            }
            return UserImpl._fromJSON(this.auth, blob);
        }
        removeCurrentUser() {
            return this.persistence._remove(this.fullUserKey);
        }
        savePersistenceForRedirect() {
            return this.persistence._set(this.fullPersistenceKey, this.persistence.type);
        }
        async setPersistence(newPersistence) {
            if (this.persistence === newPersistence) {
                return;
            }
            const currentUser = await this.getCurrentUser();
            await this.removeCurrentUser();
            this.persistence = newPersistence;
            if (currentUser) {
                return this.setCurrentUser(currentUser);
            }
        }
        delete() {
            this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
        }
        static async create(auth, persistenceHierarchy, userKey = "authUser" /* KeyName.AUTH_USER */) {
            if (!persistenceHierarchy.length) {
                return new PersistenceUserManager(_getInstance(inMemoryPersistence), auth, userKey);
            }
            // Eliminate any persistences that are not available
            const availablePersistences = (await Promise.all(persistenceHierarchy.map(async (persistence) => {
                if (await persistence._isAvailable()) {
                    return persistence;
                }
                return undefined;
            }))).filter(persistence => persistence);
            // Fall back to the first persistence listed, or in memory if none available
            let selectedPersistence = availablePersistences[0] ||
                _getInstance(inMemoryPersistence);
            const key = _persistenceKeyName(userKey, auth.config.apiKey, auth.name);
            // Pull out the existing user, setting the chosen persistence to that
            // persistence if the user exists.
            let userToMigrate = null;
            // Note, here we check for a user in _all_ persistences, not just the
            // ones deemed available. If we can migrate a user out of a broken
            // persistence, we will (but only if that persistence supports migration).
            for (const persistence of persistenceHierarchy) {
                try {
                    const blob = await persistence._get(key);
                    if (blob) {
                        let user;
                        if (typeof blob === 'string') {
                            const response = await getAccountInfo(auth, {
                                idToken: blob
                            }).catch(() => undefined);
                            if (!response) {
                                break;
                            }
                            user = await UserImpl._fromGetAccountInfoResponse(auth, response, blob);
                        }
                        else {
                            user = UserImpl._fromJSON(auth, blob); // throws for unparsable blob (wrong format)
                        }
                        if (persistence !== selectedPersistence) {
                            userToMigrate = user;
                        }
                        selectedPersistence = persistence;
                        break;
                    }
                }
                catch { }
            }
            // If we find the user in a persistence that does support migration, use
            // that migration path (of only persistences that support migration)
            const migrationHierarchy = availablePersistences.filter(p => p._shouldAllowMigration);
            // If the persistence does _not_ allow migration, just finish off here
            if (!selectedPersistence._shouldAllowMigration ||
                !migrationHierarchy.length) {
                return new PersistenceUserManager(selectedPersistence, auth, userKey);
            }
            selectedPersistence = migrationHierarchy[0];
            if (userToMigrate) {
                // This normally shouldn't throw since chosenPersistence.isAvailable() is true, but if it does
                // we'll just let it bubble to surface the error.
                await selectedPersistence._set(key, userToMigrate.toJSON());
            }
            // Attempt to clear the key in other persistences but ignore errors. This helps prevent issues
            // such as users getting stuck with a previous account after signing out and refreshing the tab.
            await Promise.all(persistenceHierarchy.map(async (persistence) => {
                if (persistence !== selectedPersistence) {
                    try {
                        await persistence._remove(key);
                    }
                    catch { }
                }
            }));
            return new PersistenceUserManager(selectedPersistence, auth, userKey);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Determine the browser for the purposes of reporting usage to the API
     */
    function _getBrowserName(userAgent) {
        const ua = userAgent.toLowerCase();
        if (ua.includes('opera/') || ua.includes('opr/') || ua.includes('opios/')) {
            return "Opera" /* BrowserName.OPERA */;
        }
        else if (_isIEMobile(ua)) {
            // Windows phone IEMobile browser.
            return "IEMobile" /* BrowserName.IEMOBILE */;
        }
        else if (ua.includes('msie') || ua.includes('trident/')) {
            return "IE" /* BrowserName.IE */;
        }
        else if (ua.includes('edge/')) {
            return "Edge" /* BrowserName.EDGE */;
        }
        else if (_isFirefox(ua)) {
            return "Firefox" /* BrowserName.FIREFOX */;
        }
        else if (ua.includes('silk/')) {
            return "Silk" /* BrowserName.SILK */;
        }
        else if (_isBlackBerry(ua)) {
            // Blackberry browser.
            return "Blackberry" /* BrowserName.BLACKBERRY */;
        }
        else if (_isWebOS(ua)) {
            // WebOS default browser.
            return "Webos" /* BrowserName.WEBOS */;
        }
        else if (_isSafari(ua)) {
            return "Safari" /* BrowserName.SAFARI */;
        }
        else if ((ua.includes('chrome/') || _isChromeIOS(ua)) &&
            !ua.includes('edge/')) {
            return "Chrome" /* BrowserName.CHROME */;
        }
        else if (_isAndroid(ua)) {
            // Android stock browser.
            return "Android" /* BrowserName.ANDROID */;
        }
        else {
            // Most modern browsers have name/version at end of user agent string.
            const re = /([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/;
            const matches = userAgent.match(re);
            if (matches?.length === 2) {
                return matches[1];
            }
        }
        return "Other" /* BrowserName.OTHER */;
    }
    function _isFirefox(ua = getUA()) {
        return /firefox\//i.test(ua);
    }
    function _isSafari(userAgent = getUA()) {
        const ua = userAgent.toLowerCase();
        return (ua.includes('safari/') &&
            !ua.includes('chrome/') &&
            !ua.includes('crios/') &&
            !ua.includes('android'));
    }
    function _isChromeIOS(ua = getUA()) {
        return /crios\//i.test(ua);
    }
    function _isIEMobile(ua = getUA()) {
        return /iemobile/i.test(ua);
    }
    function _isAndroid(ua = getUA()) {
        return /android/i.test(ua);
    }
    function _isBlackBerry(ua = getUA()) {
        return /blackberry/i.test(ua);
    }
    function _isWebOS(ua = getUA()) {
        return /webos/i.test(ua);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /*
     * Determine the SDK version string
     */
    function _getClientVersion(clientPlatform, frameworks = []) {
        let reportedPlatform;
        switch (clientPlatform) {
            case "Browser" /* ClientPlatform.BROWSER */:
                // In a browser environment, report the browser name.
                reportedPlatform = _getBrowserName(getUA());
                break;
            case "Worker" /* ClientPlatform.WORKER */:
                // Technically a worker runs from a browser but we need to differentiate a
                // worker from a browser.
                // For example: Chrome-Worker/JsCore/4.9.1/FirebaseCore-web.
                reportedPlatform = `${_getBrowserName(getUA())}-${clientPlatform}`;
                break;
            default:
                reportedPlatform = clientPlatform;
        }
        const reportedFrameworks = frameworks.length
            ? frameworks.join(',')
            : 'FirebaseCore-web'; /* default value if no other framework is used */
        return `${reportedPlatform}/${"JsCore" /* ClientImplementation.CORE */}/${SDK_VERSION}/${reportedFrameworks}`;
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class AuthMiddlewareQueue {
        constructor(auth) {
            this.auth = auth;
            this.queue = [];
        }
        pushCallback(callback, onAbort) {
            // The callback could be sync or async. Wrap it into a
            // function that is always async.
            const wrappedCallback = (user) => new Promise((resolve, reject) => {
                try {
                    const result = callback(user);
                    // Either resolve with existing promise or wrap a non-promise
                    // return value into a promise.
                    resolve(result);
                }
                catch (e) {
                    // Sync callback throws.
                    reject(e);
                }
            });
            // Attach the onAbort if present
            wrappedCallback.onAbort = onAbort;
            this.queue.push(wrappedCallback);
            const index = this.queue.length - 1;
            return () => {
                // Unsubscribe. Replace with no-op. Do not remove from array, or it will disturb
                // indexing of other elements.
                this.queue[index] = () => Promise.resolve();
            };
        }
        async runMiddleware(nextUser) {
            if (this.auth.currentUser === nextUser) {
                return;
            }
            // While running the middleware, build a temporary stack of onAbort
            // callbacks to call if one middleware callback rejects.
            const onAbortStack = [];
            try {
                for (const beforeStateCallback of this.queue) {
                    await beforeStateCallback(nextUser);
                    // Only push the onAbort if the callback succeeds
                    if (beforeStateCallback.onAbort) {
                        onAbortStack.push(beforeStateCallback.onAbort);
                    }
                }
            }
            catch (e) {
                // Run all onAbort, with separate try/catch to ignore any errors and
                // continue
                onAbortStack.reverse();
                for (const onAbort of onAbortStack) {
                    try {
                        onAbort();
                    }
                    catch (_) {
                        /* swallow error */
                    }
                }
                throw this.auth._errorFactory.create("login-blocked" /* AuthErrorCode.LOGIN_BLOCKED */, {
                    originalMessage: e?.message
                });
            }
        }
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Fetches the password policy for the currently set tenant or the project if no tenant is set.
     *
     * @param auth Auth object.
     * @param request Password policy request.
     * @returns Password policy response.
     */
    async function _getPasswordPolicy(auth, request = {}) {
        return _performApiRequest(auth, "GET" /* HttpMethod.GET */, "/v2/passwordPolicy" /* Endpoint.GET_PASSWORD_POLICY */, _addTidIfNecessary(auth, request));
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Minimum min password length enforced by the backend, even if no minimum length is set.
    const MINIMUM_MIN_PASSWORD_LENGTH = 6;
    /**
     * Stores password policy requirements and provides password validation against the policy.
     *
     * @internal
     */
    class PasswordPolicyImpl {
        constructor(response) {
            // Only include custom strength options defined in the response.
            const responseOptions = response.customStrengthOptions;
            this.customStrengthOptions = {};
            // TODO: Remove once the backend is updated to include the minimum min password length instead of undefined when there is no minimum length set.
            this.customStrengthOptions.minPasswordLength =
                responseOptions.minPasswordLength ?? MINIMUM_MIN_PASSWORD_LENGTH;
            if (responseOptions.maxPasswordLength) {
                this.customStrengthOptions.maxPasswordLength =
                    responseOptions.maxPasswordLength;
            }
            if (responseOptions.containsLowercaseCharacter !== undefined) {
                this.customStrengthOptions.containsLowercaseLetter =
                    responseOptions.containsLowercaseCharacter;
            }
            if (responseOptions.containsUppercaseCharacter !== undefined) {
                this.customStrengthOptions.containsUppercaseLetter =
                    responseOptions.containsUppercaseCharacter;
            }
            if (responseOptions.containsNumericCharacter !== undefined) {
                this.customStrengthOptions.containsNumericCharacter =
                    responseOptions.containsNumericCharacter;
            }
            if (responseOptions.containsNonAlphanumericCharacter !== undefined) {
                this.customStrengthOptions.containsNonAlphanumericCharacter =
                    responseOptions.containsNonAlphanumericCharacter;
            }
            this.enforcementState = response.enforcementState;
            if (this.enforcementState === 'ENFORCEMENT_STATE_UNSPECIFIED') {
                this.enforcementState = 'OFF';
            }
            // Use an empty string if no non-alphanumeric characters are specified in the response.
            this.allowedNonAlphanumericCharacters =
                response.allowedNonAlphanumericCharacters?.join('') ?? '';
            this.forceUpgradeOnSignin = response.forceUpgradeOnSignin ?? false;
            this.schemaVersion = response.schemaVersion;
        }
        validatePassword(password) {
            const status = {
                isValid: true,
                passwordPolicy: this
            };
            // Check the password length and character options.
            this.validatePasswordLengthOptions(password, status);
            this.validatePasswordCharacterOptions(password, status);
            // Combine the status into single isValid property.
            status.isValid && (status.isValid = status.meetsMinPasswordLength ?? true);
            status.isValid && (status.isValid = status.meetsMaxPasswordLength ?? true);
            status.isValid && (status.isValid = status.containsLowercaseLetter ?? true);
            status.isValid && (status.isValid = status.containsUppercaseLetter ?? true);
            status.isValid && (status.isValid = status.containsNumericCharacter ?? true);
            status.isValid && (status.isValid = status.containsNonAlphanumericCharacter ?? true);
            return status;
        }
        /**
         * Validates that the password meets the length options for the policy.
         *
         * @param password Password to validate.
         * @param status Validation status.
         */
        validatePasswordLengthOptions(password, status) {
            const minPasswordLength = this.customStrengthOptions.minPasswordLength;
            const maxPasswordLength = this.customStrengthOptions.maxPasswordLength;
            if (minPasswordLength) {
                status.meetsMinPasswordLength = password.length >= minPasswordLength;
            }
            if (maxPasswordLength) {
                status.meetsMaxPasswordLength = password.length <= maxPasswordLength;
            }
        }
        /**
         * Validates that the password meets the character options for the policy.
         *
         * @param password Password to validate.
         * @param status Validation status.
         */
        validatePasswordCharacterOptions(password, status) {
            // Assign statuses for requirements even if the password is an empty string.
            this.updatePasswordCharacterOptionsStatuses(status, 
            /* containsLowercaseCharacter= */ false, 
            /* containsUppercaseCharacter= */ false, 
            /* containsNumericCharacter= */ false, 
            /* containsNonAlphanumericCharacter= */ false);
            let passwordChar;
            for (let i = 0; i < password.length; i++) {
                passwordChar = password.charAt(i);
                this.updatePasswordCharacterOptionsStatuses(status, 
                /* containsLowercaseCharacter= */ passwordChar >= 'a' &&
                    passwordChar <= 'z', 
                /* containsUppercaseCharacter= */ passwordChar >= 'A' &&
                    passwordChar <= 'Z', 
                /* containsNumericCharacter= */ passwordChar >= '0' &&
                    passwordChar <= '9', 
                /* containsNonAlphanumericCharacter= */ this.allowedNonAlphanumericCharacters.includes(passwordChar));
            }
        }
        /**
         * Updates the running validation status with the statuses for the character options.
         * Expected to be called each time a character is processed to update each option status
         * based on the current character.
         *
         * @param status Validation status.
         * @param containsLowercaseCharacter Whether the character is a lowercase letter.
         * @param containsUppercaseCharacter Whether the character is an uppercase letter.
         * @param containsNumericCharacter Whether the character is a numeric character.
         * @param containsNonAlphanumericCharacter Whether the character is a non-alphanumeric character.
         */
        updatePasswordCharacterOptionsStatuses(status, containsLowercaseCharacter, containsUppercaseCharacter, containsNumericCharacter, containsNonAlphanumericCharacter) {
            if (this.customStrengthOptions.containsLowercaseLetter) {
                status.containsLowercaseLetter || (status.containsLowercaseLetter = containsLowercaseCharacter);
            }
            if (this.customStrengthOptions.containsUppercaseLetter) {
                status.containsUppercaseLetter || (status.containsUppercaseLetter = containsUppercaseCharacter);
            }
            if (this.customStrengthOptions.containsNumericCharacter) {
                status.containsNumericCharacter || (status.containsNumericCharacter = containsNumericCharacter);
            }
            if (this.customStrengthOptions.containsNonAlphanumericCharacter) {
                status.containsNonAlphanumericCharacter || (status.containsNonAlphanumericCharacter = containsNonAlphanumericCharacter);
            }
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class AuthImpl {
        constructor(app, heartbeatServiceProvider, appCheckServiceProvider, config) {
            this.app = app;
            this.heartbeatServiceProvider = heartbeatServiceProvider;
            this.appCheckServiceProvider = appCheckServiceProvider;
            this.config = config;
            this.currentUser = null;
            this.emulatorConfig = null;
            this.operations = Promise.resolve();
            this.authStateSubscription = new Subscription(this);
            this.idTokenSubscription = new Subscription(this);
            this.beforeStateQueue = new AuthMiddlewareQueue(this);
            this.redirectUser = null;
            this.isProactiveRefreshEnabled = false;
            this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION = 1;
            // Any network calls will set this to true and prevent subsequent emulator
            // initialization
            this._canInitEmulator = true;
            this._isInitialized = false;
            this._deleted = false;
            this._initializationPromise = null;
            this._popupRedirectResolver = null;
            this._errorFactory = _DEFAULT_AUTH_ERROR_FACTORY;
            this._agentRecaptchaConfig = null;
            this._tenantRecaptchaConfigs = {};
            this._projectPasswordPolicy = null;
            this._tenantPasswordPolicies = {};
            this._resolvePersistenceManagerAvailable = undefined;
            // Tracks the last notified UID for state change listeners to prevent
            // repeated calls to the callbacks. Undefined means it's never been
            // called, whereas null means it's been called with a signed out user
            this.lastNotifiedUid = undefined;
            this.languageCode = null;
            this.tenantId = null;
            this.settings = { appVerificationDisabledForTesting: false };
            this.frameworks = [];
            this.name = app.name;
            this.clientVersion = config.sdkClientVersion;
            // TODO(jamesdaniels) explore less hacky way to do this, cookie authentication needs
            // persistenceMananger to be available. see _getFinalTarget for more context
            this._persistenceManagerAvailable = new Promise(resolve => (this._resolvePersistenceManagerAvailable = resolve));
        }
        _initializeWithPersistence(persistenceHierarchy, popupRedirectResolver) {
            if (popupRedirectResolver) {
                this._popupRedirectResolver = _getInstance(popupRedirectResolver);
            }
            // Have to check for app deletion throughout initialization (after each
            // promise resolution)
            this._initializationPromise = this.queue(async () => {
                if (this._deleted) {
                    return;
                }
                this.persistenceManager = await PersistenceUserManager.create(this, persistenceHierarchy);
                this._resolvePersistenceManagerAvailable?.();
                if (this._deleted) {
                    return;
                }
                // Initialize the resolver early if necessary (only applicable to web:
                // this will cause the iframe to load immediately in certain cases)
                if (this._popupRedirectResolver?._shouldInitProactively) {
                    // If this fails, don't halt auth loading
                    try {
                        await this._popupRedirectResolver._initialize(this);
                    }
                    catch (e) {
                        /* Ignore the error */
                    }
                }
                await this.initializeCurrentUser(popupRedirectResolver);
                this.lastNotifiedUid = this.currentUser?.uid || null;
                if (this._deleted) {
                    return;
                }
                this._isInitialized = true;
            });
            return this._initializationPromise;
        }
        /**
         * If the persistence is changed in another window, the user manager will let us know
         */
        async _onStorageEvent() {
            if (this._deleted) {
                return;
            }
            const user = await this.assertedPersistence.getCurrentUser();
            if (!this.currentUser && !user) {
                // No change, do nothing (was signed out and remained signed out).
                return;
            }
            // If the same user is to be synchronized.
            if (this.currentUser && user && this.currentUser.uid === user.uid) {
                // Data update, simply copy data changes.
                this._currentUser._assign(user);
                // If tokens changed from previous user tokens, this will trigger
                // notifyAuthListeners_.
                await this.currentUser.getIdToken();
                return;
            }
            // Update current Auth state. Either a new login or logout.
            // Skip blocking callbacks, they should not apply to a change in another tab.
            await this._updateCurrentUser(user, /* skipBeforeStateCallbacks */ true);
        }
        async initializeCurrentUserFromIdToken(idToken) {
            try {
                const response = await getAccountInfo(this, { idToken });
                const user = await UserImpl._fromGetAccountInfoResponse(this, response, idToken);
                await this.directlySetCurrentUser(user);
            }
            catch (err) {
                console.warn('FirebaseServerApp could not login user with provided authIdToken: ', err);
                await this.directlySetCurrentUser(null);
            }
        }
        async initializeCurrentUser(popupRedirectResolver) {
            if (_isFirebaseServerApp(this.app)) {
                const idToken = this.app.settings.authIdToken;
                if (idToken) {
                    // Start the auth operation in the next tick to allow a moment for the customer's app to
                    // attach an emulator, if desired.
                    return new Promise(resolve => {
                        setTimeout(() => this.initializeCurrentUserFromIdToken(idToken).then(resolve, resolve));
                    });
                }
                else {
                    return this.directlySetCurrentUser(null);
                }
            }
            // First check to see if we have a pending redirect event.
            const previouslyStoredUser = (await this.assertedPersistence.getCurrentUser());
            let futureCurrentUser = previouslyStoredUser;
            let needsTocheckMiddleware = false;
            if (popupRedirectResolver && this.config.authDomain) {
                await this.getOrInitRedirectPersistenceManager();
                const redirectUserEventId = this.redirectUser?._redirectEventId;
                const storedUserEventId = futureCurrentUser?._redirectEventId;
                const result = await this.tryRedirectSignIn(popupRedirectResolver);
                // If the stored user (i.e. the old "currentUser") has a redirectId that
                // matches the redirect user, then we want to initially sign in with the
                // new user object from result.
                // TODO(samgho): More thoroughly test all of this
                if ((!redirectUserEventId || redirectUserEventId === storedUserEventId) &&
                    result?.user) {
                    futureCurrentUser = result.user;
                    needsTocheckMiddleware = true;
                }
            }
            // If no user in persistence, there is no current user. Set to null.
            if (!futureCurrentUser) {
                return this.directlySetCurrentUser(null);
            }
            if (!futureCurrentUser._redirectEventId) {
                // This isn't a redirect link operation, we can reload and bail.
                // First though, ensure that we check the middleware is happy.
                if (needsTocheckMiddleware) {
                    try {
                        await this.beforeStateQueue.runMiddleware(futureCurrentUser);
                    }
                    catch (e) {
                        futureCurrentUser = previouslyStoredUser;
                        // We know this is available since the bit is only set when the
                        // resolver is available
                        this._popupRedirectResolver._overrideRedirectResult(this, () => Promise.reject(e));
                    }
                }
                if (futureCurrentUser) {
                    return this.reloadAndSetCurrentUserOrClear(futureCurrentUser);
                }
                else {
                    return this.directlySetCurrentUser(null);
                }
            }
            _assert(this._popupRedirectResolver, this, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
            await this.getOrInitRedirectPersistenceManager();
            // If the redirect user's event ID matches the current user's event ID,
            // DO NOT reload the current user, otherwise they'll be cleared from storage.
            // This is important for the reauthenticateWithRedirect() flow.
            if (this.redirectUser &&
                this.redirectUser._redirectEventId === futureCurrentUser._redirectEventId) {
                return this.directlySetCurrentUser(futureCurrentUser);
            }
            return this.reloadAndSetCurrentUserOrClear(futureCurrentUser);
        }
        async tryRedirectSignIn(redirectResolver) {
            // The redirect user needs to be checked (and signed in if available)
            // during auth initialization. All of the normal sign in and link/reauth
            // flows call back into auth and push things onto the promise queue. We
            // need to await the result of the redirect sign in *inside the promise
            // queue*. This presents a problem: we run into deadlock. See:
            //    ┌> [Initialization] ─────┐
            //    ┌> [<other queue tasks>] │
            //    └─ [getRedirectResult] <─┘
            //    where [] are tasks on the queue and arrows denote awaits
            // Initialization will never complete because it's waiting on something
            // that's waiting for initialization to complete!
            //
            // Instead, this method calls getRedirectResult() (stored in
            // _completeRedirectFn) with an optional parameter that instructs all of
            // the underlying auth operations to skip anything that mutates auth state.
            let result = null;
            try {
                // We know this._popupRedirectResolver is set since redirectResolver
                // is passed in. The _completeRedirectFn expects the unwrapped extern.
                result = await this._popupRedirectResolver._completeRedirectFn(this, redirectResolver, true);
            }
            catch (e) {
                // Swallow any errors here; the code can retrieve them in
                // getRedirectResult().
                await this._setRedirectUser(null);
            }
            return result;
        }
        async reloadAndSetCurrentUserOrClear(user) {
            try {
                await _reloadWithoutSaving(user);
            }
            catch (e) {
                if (e?.code !==
                    `auth/${"network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */}`) {
                    // Something's wrong with the user's token. Log them out and remove
                    // them from storage
                    return this.directlySetCurrentUser(null);
                }
            }
            return this.directlySetCurrentUser(user);
        }
        useDeviceLanguage() {
            this.languageCode = _getUserLanguage();
        }
        async _delete() {
            this._deleted = true;
        }
        async updateCurrentUser(userExtern) {
            if (_isFirebaseServerApp(this.app)) {
                return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this));
            }
            // The public updateCurrentUser method needs to make a copy of the user,
            // and also check that the project matches
            const user = userExtern
                ? getModularInstance(userExtern)
                : null;
            if (user) {
                _assert(user.auth.config.apiKey === this.config.apiKey, this, "invalid-user-token" /* AuthErrorCode.INVALID_AUTH */);
            }
            return this._updateCurrentUser(user && user._clone(this));
        }
        async _updateCurrentUser(user, skipBeforeStateCallbacks = false) {
            if (this._deleted) {
                return;
            }
            if (user) {
                _assert(this.tenantId === user.tenantId, this, "tenant-id-mismatch" /* AuthErrorCode.TENANT_ID_MISMATCH */);
            }
            if (!skipBeforeStateCallbacks) {
                await this.beforeStateQueue.runMiddleware(user);
            }
            return this.queue(async () => {
                await this.directlySetCurrentUser(user);
                this.notifyAuthListeners();
            });
        }
        async signOut() {
            if (_isFirebaseServerApp(this.app)) {
                return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this));
            }
            // Run first, to block _setRedirectUser() if any callbacks fail.
            await this.beforeStateQueue.runMiddleware(null);
            // Clear the redirect user when signOut is called
            if (this.redirectPersistenceManager || this._popupRedirectResolver) {
                await this._setRedirectUser(null);
            }
            // Prevent callbacks from being called again in _updateCurrentUser, as
            // they were already called in the first line.
            return this._updateCurrentUser(null, /* skipBeforeStateCallbacks */ true);
        }
        setPersistence(persistence) {
            if (_isFirebaseServerApp(this.app)) {
                return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this));
            }
            return this.queue(async () => {
                await this.assertedPersistence.setPersistence(_getInstance(persistence));
            });
        }
        _getRecaptchaConfig() {
            if (this.tenantId == null) {
                return this._agentRecaptchaConfig;
            }
            else {
                return this._tenantRecaptchaConfigs[this.tenantId];
            }
        }
        async validatePassword(password) {
            if (!this._getPasswordPolicyInternal()) {
                await this._updatePasswordPolicy();
            }
            // Password policy will be defined after fetching.
            const passwordPolicy = this._getPasswordPolicyInternal();
            // Check that the policy schema version is supported by the SDK.
            // TODO: Update this logic to use a max supported policy schema version once we have multiple schema versions.
            if (passwordPolicy.schemaVersion !==
                this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION) {
                return Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version" /* AuthErrorCode.UNSUPPORTED_PASSWORD_POLICY_SCHEMA_VERSION */, {}));
            }
            return passwordPolicy.validatePassword(password);
        }
        _getPasswordPolicyInternal() {
            if (this.tenantId === null) {
                return this._projectPasswordPolicy;
            }
            else {
                return this._tenantPasswordPolicies[this.tenantId];
            }
        }
        async _updatePasswordPolicy() {
            const response = await _getPasswordPolicy(this);
            const passwordPolicy = new PasswordPolicyImpl(response);
            if (this.tenantId === null) {
                this._projectPasswordPolicy = passwordPolicy;
            }
            else {
                this._tenantPasswordPolicies[this.tenantId] = passwordPolicy;
            }
        }
        _getPersistenceType() {
            return this.assertedPersistence.persistence.type;
        }
        _getPersistence() {
            return this.assertedPersistence.persistence;
        }
        _updateErrorMap(errorMap) {
            this._errorFactory = new ErrorFactory('auth', 'Firebase', errorMap());
        }
        onAuthStateChanged(nextOrObserver, error, completed) {
            return this.registerStateListener(this.authStateSubscription, nextOrObserver, error, completed);
        }
        beforeAuthStateChanged(callback, onAbort) {
            return this.beforeStateQueue.pushCallback(callback, onAbort);
        }
        onIdTokenChanged(nextOrObserver, error, completed) {
            return this.registerStateListener(this.idTokenSubscription, nextOrObserver, error, completed);
        }
        authStateReady() {
            return new Promise((resolve, reject) => {
                if (this.currentUser) {
                    resolve();
                }
                else {
                    const unsubscribe = this.onAuthStateChanged(() => {
                        unsubscribe();
                        resolve();
                    }, reject);
                }
            });
        }
        /**
         * Revokes the given access token. Currently only supports Apple OAuth access tokens.
         */
        async revokeAccessToken(token) {
            if (this.currentUser) {
                const idToken = await this.currentUser.getIdToken();
                // Generalize this to accept other providers once supported.
                const request = {
                    providerId: 'apple.com',
                    tokenType: "ACCESS_TOKEN" /* TokenType.ACCESS_TOKEN */,
                    token,
                    idToken
                };
                if (this.tenantId != null) {
                    request.tenantId = this.tenantId;
                }
                await revokeToken(this, request);
            }
        }
        toJSON() {
            return {
                apiKey: this.config.apiKey,
                authDomain: this.config.authDomain,
                appName: this.name,
                currentUser: this._currentUser?.toJSON()
            };
        }
        async _setRedirectUser(user, popupRedirectResolver) {
            const redirectManager = await this.getOrInitRedirectPersistenceManager(popupRedirectResolver);
            return user === null
                ? redirectManager.removeCurrentUser()
                : redirectManager.setCurrentUser(user);
        }
        async getOrInitRedirectPersistenceManager(popupRedirectResolver) {
            if (!this.redirectPersistenceManager) {
                const resolver = (popupRedirectResolver && _getInstance(popupRedirectResolver)) ||
                    this._popupRedirectResolver;
                _assert(resolver, this, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
                this.redirectPersistenceManager = await PersistenceUserManager.create(this, [_getInstance(resolver._redirectPersistence)], "redirectUser" /* KeyName.REDIRECT_USER */);
                this.redirectUser =
                    await this.redirectPersistenceManager.getCurrentUser();
            }
            return this.redirectPersistenceManager;
        }
        async _redirectUserForId(id) {
            // Make sure we've cleared any pending persistence actions if we're not in
            // the initializer
            if (this._isInitialized) {
                await this.queue(async () => { });
            }
            if (this._currentUser?._redirectEventId === id) {
                return this._currentUser;
            }
            if (this.redirectUser?._redirectEventId === id) {
                return this.redirectUser;
            }
            return null;
        }
        async _persistUserIfCurrent(user) {
            if (user === this.currentUser) {
                return this.queue(async () => this.directlySetCurrentUser(user));
            }
        }
        /** Notifies listeners only if the user is current */
        _notifyListenersIfCurrent(user) {
            if (user === this.currentUser) {
                this.notifyAuthListeners();
            }
        }
        _key() {
            return `${this.config.authDomain}:${this.config.apiKey}:${this.name}`;
        }
        _startProactiveRefresh() {
            this.isProactiveRefreshEnabled = true;
            if (this.currentUser) {
                this._currentUser._startProactiveRefresh();
            }
        }
        _stopProactiveRefresh() {
            this.isProactiveRefreshEnabled = false;
            if (this.currentUser) {
                this._currentUser._stopProactiveRefresh();
            }
        }
        /** Returns the current user cast as the internal type */
        get _currentUser() {
            return this.currentUser;
        }
        notifyAuthListeners() {
            if (!this._isInitialized) {
                return;
            }
            this.idTokenSubscription.next(this.currentUser);
            const currentUid = this.currentUser?.uid ?? null;
            if (this.lastNotifiedUid !== currentUid) {
                this.lastNotifiedUid = currentUid;
                this.authStateSubscription.next(this.currentUser);
            }
        }
        registerStateListener(subscription, nextOrObserver, error, completed) {
            if (this._deleted) {
                return () => { };
            }
            const cb = typeof nextOrObserver === 'function'
                ? nextOrObserver
                : nextOrObserver.next.bind(nextOrObserver);
            let isUnsubscribed = false;
            const promise = this._isInitialized
                ? Promise.resolve()
                : this._initializationPromise;
            _assert(promise, this, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            // The callback needs to be called asynchronously per the spec.
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            promise.then(() => {
                if (isUnsubscribed) {
                    return;
                }
                cb(this.currentUser);
            });
            if (typeof nextOrObserver === 'function') {
                const unsubscribe = subscription.addObserver(nextOrObserver, error, completed);
                return () => {
                    isUnsubscribed = true;
                    unsubscribe();
                };
            }
            else {
                const unsubscribe = subscription.addObserver(nextOrObserver);
                return () => {
                    isUnsubscribed = true;
                    unsubscribe();
                };
            }
        }
        /**
         * Unprotected (from race conditions) method to set the current user. This
         * should only be called from within a queued callback. This is necessary
         * because the queue shouldn't rely on another queued callback.
         */
        async directlySetCurrentUser(user) {
            if (this.currentUser && this.currentUser !== user) {
                this._currentUser._stopProactiveRefresh();
            }
            if (user && this.isProactiveRefreshEnabled) {
                user._startProactiveRefresh();
            }
            this.currentUser = user;
            if (user) {
                await this.assertedPersistence.setCurrentUser(user);
            }
            else {
                await this.assertedPersistence.removeCurrentUser();
            }
        }
        queue(action) {
            // In case something errors, the callback still should be called in order
            // to keep the promise chain alive
            this.operations = this.operations.then(action, action);
            return this.operations;
        }
        get assertedPersistence() {
            _assert(this.persistenceManager, this, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            return this.persistenceManager;
        }
        _logFramework(framework) {
            if (!framework || this.frameworks.includes(framework)) {
                return;
            }
            this.frameworks.push(framework);
            // Sort alphabetically so that "FirebaseCore-web,FirebaseUI-web" and
            // "FirebaseUI-web,FirebaseCore-web" aren't viewed as different.
            this.frameworks.sort();
            this.clientVersion = _getClientVersion(this.config.clientPlatform, this._getFrameworks());
        }
        _getFrameworks() {
            return this.frameworks;
        }
        async _getAdditionalHeaders() {
            // Additional headers on every request
            const headers = {
                ["X-Client-Version" /* HttpHeader.X_CLIENT_VERSION */]: this.clientVersion
            };
            if (this.app.options.appId) {
                headers["X-Firebase-gmpid" /* HttpHeader.X_FIREBASE_GMPID */] = this.app.options.appId;
            }
            // If the heartbeat service exists, add the heartbeat string
            const heartbeatsHeader = await this.heartbeatServiceProvider
                .getImmediate({
                optional: true
            })
                ?.getHeartbeatsHeader();
            if (heartbeatsHeader) {
                headers["X-Firebase-Client" /* HttpHeader.X_FIREBASE_CLIENT */] = heartbeatsHeader;
            }
            // If the App Check service exists, add the App Check token in the headers
            const appCheckToken = await this._getAppCheckToken();
            if (appCheckToken) {
                headers["X-Firebase-AppCheck" /* HttpHeader.X_FIREBASE_APP_CHECK */] = appCheckToken;
            }
            return headers;
        }
        async _getAppCheckToken() {
            if (_isFirebaseServerApp(this.app) && this.app.settings.appCheckToken) {
                return this.app.settings.appCheckToken;
            }
            const appCheckTokenResult = await this.appCheckServiceProvider
                .getImmediate({ optional: true })
                ?.getToken();
            if (appCheckTokenResult?.error) {
                // Context: appCheck.getToken() will never throw even if an error happened.
                // In the error case, a dummy token will be returned along with an error field describing
                // the error. In general, we shouldn't care about the error condition and just use
                // the token (actual or dummy) to send requests.
                _logWarn(`Error while retrieving App Check token: ${appCheckTokenResult.error}`);
            }
            return appCheckTokenResult?.token;
        }
    }
    /**
     * Method to be used to cast down to our private implementation of Auth.
     * It will also handle unwrapping from the compat type if necessary
     *
     * @param auth Auth object passed in from developer
     */
    function _castAuth(auth) {
        return getModularInstance(auth);
    }
    /** Helper class to wrap subscriber logic */
    class Subscription {
        constructor(auth) {
            this.auth = auth;
            this.observer = null;
            this.addObserver = createSubscribe(observer => (this.observer = observer));
        }
        get next() {
            _assert(this.observer, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            return this.observer.next.bind(this.observer);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Initializes an {@link Auth} instance with fine-grained control over
     * {@link Dependencies}.
     *
     * @remarks
     *
     * This function allows more control over the {@link Auth} instance than
     * {@link getAuth}. `getAuth` uses platform-specific defaults to supply
     * the {@link Dependencies}. In general, `getAuth` is the easiest way to
     * initialize Auth and works for most use cases. Use `initializeAuth` if you
     * need control over which persistence layer is used, or to minimize bundle
     * size if you're not using either `signInWithPopup` or `signInWithRedirect`.
     *
     * For example, if your app only uses anonymous accounts and you only want
     * accounts saved for the current session, initialize `Auth` with:
     *
     * ```js
     * const auth = initializeAuth(app, {
     *   persistence: browserSessionPersistence,
     *   popupRedirectResolver: undefined,
     * });
     * ```
     *
     * @public
     */
    function initializeAuth(app, deps) {
        const provider = _getProvider(app, 'auth');
        if (provider.isInitialized()) {
            const auth = provider.getImmediate();
            const initialOptions = provider.getOptions();
            if (deepEqual(initialOptions, deps ?? {})) {
                return auth;
            }
            else {
                _fail(auth, "already-initialized" /* AuthErrorCode.ALREADY_INITIALIZED */);
            }
        }
        const auth = provider.initialize({ options: deps });
        return auth;
    }
    function _initializeAuthInstance(auth, deps) {
        const persistence = deps?.persistence || [];
        const hierarchy = (Array.isArray(persistence) ? persistence : [persistence]).map(_getInstance);
        if (deps?.errorMap) {
            auth._updateErrorMap(deps.errorMap);
        }
        // This promise is intended to float; auth initialization happens in the
        // background, meanwhile the auth object may be used by the app.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        auth._initializeWithPersistence(hierarchy, deps?.popupRedirectResolver);
    }
    /**
     * Adds an observer for changes to the user's sign-in state.
     *
     * @remarks
     * To keep the old behavior, see {@link onIdTokenChanged}.
     *
     * @param auth - The {@link Auth} instance.
     * @param nextOrObserver - callback triggered on change.
     * @param error - Deprecated. This callback is never triggered. Errors
     * on signing in/out can be caught in promises returned from
     * sign-in/sign-out functions.
     * @param completed - Deprecated. This callback is never triggered.
     *
     * @public
     */
    function onAuthStateChanged(auth, nextOrObserver, error, completed) {
        return getModularInstance(auth).onAuthStateChanged(nextOrObserver, error, completed);
    }

    const STORAGE_AVAILABLE_KEY = '__sak';

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Shim for Promise.allSettled, note the slightly different format of `fulfilled` vs `status`.
     *
     * @param promises - Array of promises to wait on.
     */
    function _allSettled(promises) {
        return Promise.all(promises.map(async (promise) => {
            try {
                const value = await promise;
                return {
                    fulfilled: true,
                    value
                };
            }
            catch (reason) {
                return {
                    fulfilled: false,
                    reason
                };
            }
        }));
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Interface class for receiving messages.
     *
     */
    class Receiver {
        constructor(eventTarget) {
            this.eventTarget = eventTarget;
            this.handlersMap = {};
            this.boundEventHandler = this.handleEvent.bind(this);
        }
        /**
         * Obtain an instance of a Receiver for a given event target, if none exists it will be created.
         *
         * @param eventTarget - An event target (such as window or self) through which the underlying
         * messages will be received.
         */
        static _getInstance(eventTarget) {
            // The results are stored in an array since objects can't be keys for other
            // objects. In addition, setting a unique property on an event target as a
            // hash map key may not be allowed due to CORS restrictions.
            const existingInstance = this.receivers.find(receiver => receiver.isListeningto(eventTarget));
            if (existingInstance) {
                return existingInstance;
            }
            const newInstance = new Receiver(eventTarget);
            this.receivers.push(newInstance);
            return newInstance;
        }
        isListeningto(eventTarget) {
            return this.eventTarget === eventTarget;
        }
        /**
         * Fans out a MessageEvent to the appropriate listeners.
         *
         * @remarks
         * Sends an {@link Status.ACK} upon receipt and a {@link Status.DONE} once all handlers have
         * finished processing.
         *
         * @param event - The MessageEvent.
         *
         */
        async handleEvent(event) {
            const messageEvent = event;
            const { eventId, eventType, data } = messageEvent.data;
            const handlers = this.handlersMap[eventType];
            if (!handlers?.size) {
                return;
            }
            messageEvent.ports[0].postMessage({
                status: "ack" /* _Status.ACK */,
                eventId,
                eventType
            });
            const promises = Array.from(handlers).map(async (handler) => handler(messageEvent.origin, data));
            const response = await _allSettled(promises);
            messageEvent.ports[0].postMessage({
                status: "done" /* _Status.DONE */,
                eventId,
                eventType,
                response
            });
        }
        /**
         * Subscribe an event handler for a particular event.
         *
         * @param eventType - Event name to subscribe to.
         * @param eventHandler - The event handler which should receive the events.
         *
         */
        _subscribe(eventType, eventHandler) {
            if (Object.keys(this.handlersMap).length === 0) {
                this.eventTarget.addEventListener('message', this.boundEventHandler);
            }
            if (!this.handlersMap[eventType]) {
                this.handlersMap[eventType] = new Set();
            }
            this.handlersMap[eventType].add(eventHandler);
        }
        /**
         * Unsubscribe an event handler from a particular event.
         *
         * @param eventType - Event name to unsubscribe from.
         * @param eventHandler - Optional event handler, if none provided, unsubscribe all handlers on this event.
         *
         */
        _unsubscribe(eventType, eventHandler) {
            if (this.handlersMap[eventType] && eventHandler) {
                this.handlersMap[eventType].delete(eventHandler);
            }
            if (!eventHandler || this.handlersMap[eventType].size === 0) {
                delete this.handlersMap[eventType];
            }
            if (Object.keys(this.handlersMap).length === 0) {
                this.eventTarget.removeEventListener('message', this.boundEventHandler);
            }
        }
    }
    Receiver.receivers = [];

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _generateEventId(prefix = '', digits = 10) {
        let random = '';
        for (let i = 0; i < digits; i++) {
            random += Math.floor(Math.random() * 10);
        }
        return prefix + random;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Interface for sending messages and waiting for a completion response.
     *
     */
    class Sender {
        constructor(target) {
            this.target = target;
            this.handlers = new Set();
        }
        /**
         * Unsubscribe the handler and remove it from our tracking Set.
         *
         * @param handler - The handler to unsubscribe.
         */
        removeMessageHandler(handler) {
            if (handler.messageChannel) {
                handler.messageChannel.port1.removeEventListener('message', handler.onMessage);
                handler.messageChannel.port1.close();
            }
            this.handlers.delete(handler);
        }
        /**
         * Send a message to the Receiver located at {@link target}.
         *
         * @remarks
         * We'll first wait a bit for an ACK , if we get one we will wait significantly longer until the
         * receiver has had a chance to fully process the event.
         *
         * @param eventType - Type of event to send.
         * @param data - The payload of the event.
         * @param timeout - Timeout for waiting on an ACK from the receiver.
         *
         * @returns An array of settled promises from all the handlers that were listening on the receiver.
         */
        async _send(eventType, data, timeout = 50 /* _TimeoutDuration.ACK */) {
            const messageChannel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
            if (!messageChannel) {
                throw new Error("connection_unavailable" /* _MessageError.CONNECTION_UNAVAILABLE */);
            }
            // Node timers and browser timers return fundamentally different types.
            // We don't actually care what the value is but TS won't accept unknown and
            // we can't cast properly in both environments.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let completionTimer;
            let handler;
            return new Promise((resolve, reject) => {
                const eventId = _generateEventId('', 20);
                messageChannel.port1.start();
                const ackTimer = setTimeout(() => {
                    reject(new Error("unsupported_event" /* _MessageError.UNSUPPORTED_EVENT */));
                }, timeout);
                handler = {
                    messageChannel,
                    onMessage(event) {
                        const messageEvent = event;
                        if (messageEvent.data.eventId !== eventId) {
                            return;
                        }
                        switch (messageEvent.data.status) {
                            case "ack" /* _Status.ACK */:
                                // The receiver should ACK first.
                                clearTimeout(ackTimer);
                                completionTimer = setTimeout(() => {
                                    reject(new Error("timeout" /* _MessageError.TIMEOUT */));
                                }, 3000 /* _TimeoutDuration.COMPLETION */);
                                break;
                            case "done" /* _Status.DONE */:
                                // Once the receiver's handlers are finished we will get the results.
                                clearTimeout(completionTimer);
                                resolve(messageEvent.data.response);
                                break;
                            default:
                                clearTimeout(ackTimer);
                                clearTimeout(completionTimer);
                                reject(new Error("invalid_response" /* _MessageError.INVALID_RESPONSE */));
                                break;
                        }
                    }
                };
                this.handlers.add(handler);
                messageChannel.port1.addEventListener('message', handler.onMessage);
                this.target.postMessage({
                    eventType,
                    eventId,
                    data
                }, [messageChannel.port2]);
            }).finally(() => {
                if (handler) {
                    this.removeMessageHandler(handler);
                }
            });
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Lazy accessor for window, since the compat layer won't tree shake this out,
     * we need to make sure not to mess with window unless we have to
     */
    function _window() {
        return window;
    }

    /**
     * @license
     * Copyright 2020 Google LLC.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _isWorker() {
        return (typeof _window()['WorkerGlobalScope'] !== 'undefined' &&
            typeof _window()['importScripts'] === 'function');
    }
    async function _getActiveServiceWorker() {
        if (!navigator?.serviceWorker) {
            return null;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            return registration.active;
        }
        catch {
            return null;
        }
    }
    function _getServiceWorkerController() {
        return navigator?.serviceWorker?.controller || null;
    }
    function _getWorkerGlobalScope() {
        return _isWorker() ? self : null;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DB_NAME = 'firebaseLocalStorageDb';
    const DB_VERSION = 1;
    const DB_OBJECTSTORE_NAME = 'firebaseLocalStorage';
    const DB_DATA_KEYPATH = 'fbase_key';
    /**
     * Promise wrapper for IDBRequest
     *
     * Unfortunately we can't cleanly extend Promise<T> since promises are not callable in ES6
     *
     */
    class DBPromise {
        constructor(request) {
            this.request = request;
        }
        toPromise() {
            return new Promise((resolve, reject) => {
                this.request.addEventListener('success', () => {
                    resolve(this.request.result);
                });
                this.request.addEventListener('error', () => {
                    reject(this.request.error);
                });
            });
        }
    }
    function getObjectStore(db, isReadWrite) {
        return db
            .transaction([DB_OBJECTSTORE_NAME], isReadWrite ? 'readwrite' : 'readonly')
            .objectStore(DB_OBJECTSTORE_NAME);
    }
    function _deleteDatabase() {
        const request = indexedDB.deleteDatabase(DB_NAME);
        return new DBPromise(request).toPromise();
    }
    function _openDatabase() {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        return new Promise((resolve, reject) => {
            request.addEventListener('error', () => {
                reject(request.error);
            });
            request.addEventListener('upgradeneeded', () => {
                const db = request.result;
                try {
                    db.createObjectStore(DB_OBJECTSTORE_NAME, { keyPath: DB_DATA_KEYPATH });
                }
                catch (e) {
                    reject(e);
                }
            });
            request.addEventListener('success', async () => {
                const db = request.result;
                // Strange bug that occurs in Firefox when multiple tabs are opened at the
                // same time. The only way to recover seems to be deleting the database
                // and re-initializing it.
                // https://github.com/firebase/firebase-js-sdk/issues/634
                if (!db.objectStoreNames.contains(DB_OBJECTSTORE_NAME)) {
                    // Need to close the database or else you get a `blocked` event
                    db.close();
                    await _deleteDatabase();
                    resolve(await _openDatabase());
                }
                else {
                    resolve(db);
                }
            });
        });
    }
    async function _putObject(db, key, value) {
        const request = getObjectStore(db, true).put({
            [DB_DATA_KEYPATH]: key,
            value
        });
        return new DBPromise(request).toPromise();
    }
    async function getObject(db, key) {
        const request = getObjectStore(db, false).get(key);
        const data = await new DBPromise(request).toPromise();
        return data === undefined ? null : data.value;
    }
    function _deleteObject(db, key) {
        const request = getObjectStore(db, true).delete(key);
        return new DBPromise(request).toPromise();
    }
    const _POLLING_INTERVAL_MS = 800;
    const _TRANSACTION_RETRY_COUNT = 3;
    class IndexedDBLocalPersistence {
        constructor() {
            this.type = "LOCAL" /* PersistenceType.LOCAL */;
            this.dbPromise = null;
            this._shouldAllowMigration = true;
            this.listeners = {};
            this.localCache = {};
            // setTimeout return value is platform specific
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.pollTimer = null;
            this.pendingWrites = 0;
            this.receiver = null;
            this.sender = null;
            this.serviceWorkerReceiverAvailable = false;
            this.activeServiceWorker = null;
            // Fire & forget the service worker registration as it may never resolve
            this._workerInitializationPromise =
                this.initializeServiceWorkerMessaging().then(() => { }, () => { });
        }
        async _openDb() {
            if (this.dbPromise) {
                return this.dbPromise;
            }
            this.dbPromise = _openDatabase();
            this.dbPromise.catch(() => {
                this.dbPromise = null;
            });
            return this.dbPromise;
        }
        async _withRetries(op) {
            let numAttempts = 0;
            while (true) {
                try {
                    const db = await this._openDb();
                    return await op(db);
                }
                catch (e) {
                    if (numAttempts++ > _TRANSACTION_RETRY_COUNT) {
                        throw e;
                    }
                    if (this.dbPromise) {
                        const db = await this.dbPromise;
                        db.close();
                        this.dbPromise = null;
                    }
                    // TODO: consider adding exponential backoff
                }
            }
        }
        /**
         * IndexedDB events do not propagate from the main window to the worker context.  We rely on a
         * postMessage interface to send these events to the worker ourselves.
         */
        async initializeServiceWorkerMessaging() {
            return _isWorker() ? this.initializeReceiver() : this.initializeSender();
        }
        /**
         * As the worker we should listen to events from the main window.
         */
        async initializeReceiver() {
            this.receiver = Receiver._getInstance(_getWorkerGlobalScope());
            // Refresh from persistence if we receive a KeyChanged message.
            this.receiver._subscribe("keyChanged" /* _EventType.KEY_CHANGED */, async (_origin, data) => {
                const keys = await this._poll();
                return {
                    keyProcessed: keys.includes(data.key)
                };
            });
            // Let the sender know that we are listening so they give us more timeout.
            this.receiver._subscribe("ping" /* _EventType.PING */, async (_origin, _data) => {
                return ["keyChanged" /* _EventType.KEY_CHANGED */];
            });
        }
        /**
         * As the main window, we should let the worker know when keys change (set and remove).
         *
         * @remarks
         * {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/ready | ServiceWorkerContainer.ready}
         * may not resolve.
         */
        async initializeSender() {
            // Check to see if there's an active service worker.
            this.activeServiceWorker = await _getActiveServiceWorker();
            if (!this.activeServiceWorker) {
                return;
            }
            this.sender = new Sender(this.activeServiceWorker);
            // Ping the service worker to check what events they can handle.
            const results = await this.sender._send("ping" /* _EventType.PING */, {}, 800 /* _TimeoutDuration.LONG_ACK */);
            if (!results) {
                return;
            }
            if (results[0]?.fulfilled &&
                results[0]?.value.includes("keyChanged" /* _EventType.KEY_CHANGED */)) {
                this.serviceWorkerReceiverAvailable = true;
            }
        }
        /**
         * Let the worker know about a changed key, the exact key doesn't technically matter since the
         * worker will just trigger a full sync anyway.
         *
         * @remarks
         * For now, we only support one service worker per page.
         *
         * @param key - Storage key which changed.
         */
        async notifyServiceWorker(key) {
            if (!this.sender ||
                !this.activeServiceWorker ||
                _getServiceWorkerController() !== this.activeServiceWorker) {
                return;
            }
            try {
                await this.sender._send("keyChanged" /* _EventType.KEY_CHANGED */, { key }, 
                // Use long timeout if receiver has previously responded to a ping from us.
                this.serviceWorkerReceiverAvailable
                    ? 800 /* _TimeoutDuration.LONG_ACK */
                    : 50 /* _TimeoutDuration.ACK */);
            }
            catch {
                // This is a best effort approach. Ignore errors.
            }
        }
        async _isAvailable() {
            try {
                if (!indexedDB) {
                    return false;
                }
                await this._withRetries(async (db) => {
                    await _putObject(db, STORAGE_AVAILABLE_KEY, '1');
                    await _deleteObject(db, STORAGE_AVAILABLE_KEY);
                });
                return true;
            }
            catch { }
            return false;
        }
        async _withPendingWrite(write) {
            this.pendingWrites++;
            try {
                await write();
            }
            finally {
                this.pendingWrites--;
            }
        }
        async _set(key, value) {
            return this._withPendingWrite(async () => {
                await this._withRetries((db) => _putObject(db, key, value));
                this.localCache[key] = value;
                return this.notifyServiceWorker(key);
            });
        }
        async _get(key) {
            const obj = (await this._withRetries((db) => getObject(db, key)));
            this.localCache[key] = obj;
            return obj;
        }
        async _remove(key) {
            return this._withPendingWrite(async () => {
                await this._withRetries((db) => _deleteObject(db, key));
                delete this.localCache[key];
                return this.notifyServiceWorker(key);
            });
        }
        async _poll() {
            // TODO: check if we need to fallback if getAll is not supported
            const result = await this._withRetries((db) => {
                const getAllRequest = getObjectStore(db, false).getAll();
                return new DBPromise(getAllRequest).toPromise();
            });
            if (!result) {
                return [];
            }
            // If we have pending writes in progress abort, we'll get picked up on the next poll
            if (this.pendingWrites !== 0) {
                return [];
            }
            const keys = [];
            const keysInResult = new Set();
            if (result.length !== 0) {
                for (const { fbase_key: key, value } of result) {
                    keysInResult.add(key);
                    if (JSON.stringify(this.localCache[key]) !== JSON.stringify(value)) {
                        this.notifyListeners(key, value);
                        keys.push(key);
                    }
                }
            }
            for (const localKey of Object.keys(this.localCache)) {
                if (this.localCache[localKey] && !keysInResult.has(localKey)) {
                    // Deleted
                    this.notifyListeners(localKey, null);
                    keys.push(localKey);
                }
            }
            return keys;
        }
        notifyListeners(key, newValue) {
            this.localCache[key] = newValue;
            const listeners = this.listeners[key];
            if (listeners) {
                for (const listener of Array.from(listeners)) {
                    listener(newValue);
                }
            }
        }
        startPolling() {
            this.stopPolling();
            this.pollTimer = setInterval(async () => this._poll(), _POLLING_INTERVAL_MS);
        }
        stopPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        }
        _addListener(key, listener) {
            if (Object.keys(this.listeners).length === 0) {
                this.startPolling();
            }
            if (!this.listeners[key]) {
                this.listeners[key] = new Set();
                // Populate the cache to avoid spuriously triggering on first poll.
                void this._get(key); // This can happen in the background async and we can return immediately.
            }
            this.listeners[key].add(listener);
        }
        _removeListener(key, listener) {
            if (this.listeners[key]) {
                this.listeners[key].delete(listener);
                if (this.listeners[key].size === 0) {
                    delete this.listeners[key];
                }
            }
            if (Object.keys(this.listeners).length === 0) {
                this.stopPolling();
            }
        }
    }
    IndexedDBLocalPersistence.type = 'LOCAL';
    /**
     * An implementation of {@link Persistence} of type `LOCAL` using `indexedDB`
     * for the underlying storage.
     *
     * @public
     */
    const indexedDBLocalPersistence = IndexedDBLocalPersistence;
    new Delay(30000, 60000);

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    new Delay(2000, 10000);

    /**
     * @license
     * Copyright 2020 Google LLC.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    new Delay(30000, 60000);

    /**
     * @license
     * Copyright 2020 Google LLC.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    new Delay(5000, 15000);

    var name = "@firebase/auth";
    var version = "1.13.2";

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class AuthInterop {
        constructor(auth) {
            this.auth = auth;
            this.internalListeners = new Map();
        }
        getUid() {
            this.assertAuthConfigured();
            return this.auth.currentUser?.uid || null;
        }
        async getToken(forceRefresh) {
            this.assertAuthConfigured();
            await this.auth._initializationPromise;
            if (!this.auth.currentUser) {
                return null;
            }
            const accessToken = await this.auth.currentUser.getIdToken(forceRefresh);
            return { accessToken };
        }
        addAuthTokenListener(listener) {
            this.assertAuthConfigured();
            if (this.internalListeners.has(listener)) {
                return;
            }
            const unsubscribe = this.auth.onIdTokenChanged(user => {
                listener(user?.stsTokenManager.accessToken || null);
            });
            this.internalListeners.set(listener, unsubscribe);
            this.updateProactiveRefresh();
        }
        removeAuthTokenListener(listener) {
            this.assertAuthConfigured();
            const unsubscribe = this.internalListeners.get(listener);
            if (!unsubscribe) {
                return;
            }
            this.internalListeners.delete(listener);
            unsubscribe();
            this.updateProactiveRefresh();
        }
        assertAuthConfigured() {
            _assert(this.auth._initializationPromise, "dependent-sdk-initialized-before-auth" /* AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH */);
        }
        updateProactiveRefresh() {
            if (this.internalListeners.size > 0) {
                this.auth._startProactiveRefresh();
            }
            else {
                this.auth._stopProactiveRefresh();
            }
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function getVersionForPlatform(clientPlatform) {
        switch (clientPlatform) {
            case "Node" /* ClientPlatform.NODE */:
                return 'node';
            case "ReactNative" /* ClientPlatform.REACT_NATIVE */:
                return 'rn';
            case "Worker" /* ClientPlatform.WORKER */:
                return 'webworker';
            case "Cordova" /* ClientPlatform.CORDOVA */:
                return 'cordova';
            case "WebExtension" /* ClientPlatform.WEB_EXTENSION */:
                return 'web-extension';
            default:
                return undefined;
        }
    }
    /** @internal */
    function registerAuth(clientPlatform) {
        _registerComponent(new Component("auth" /* _ComponentName.AUTH */, (container, { options: deps }) => {
            const app = container.getProvider('app').getImmediate();
            const heartbeatServiceProvider = container.getProvider('heartbeat');
            const appCheckServiceProvider = container.getProvider('app-check-internal');
            const { apiKey, authDomain } = app.options;
            _assert(apiKey && !apiKey.includes(':'), "invalid-api-key" /* AuthErrorCode.INVALID_API_KEY */, { appName: app.name });
            const config = {
                apiKey,
                authDomain,
                clientPlatform,
                apiHost: "identitytoolkit.googleapis.com" /* DefaultConfig.API_HOST */,
                tokenApiHost: "securetoken.googleapis.com" /* DefaultConfig.TOKEN_API_HOST */,
                apiScheme: "https" /* DefaultConfig.API_SCHEME */,
                sdkClientVersion: _getClientVersion(clientPlatform)
            };
            const authInstance = new AuthImpl(app, heartbeatServiceProvider, appCheckServiceProvider, config);
            _initializeAuthInstance(authInstance, deps);
            return authInstance;
        }, "PUBLIC" /* ComponentType.PUBLIC */)
            /**
             * Auth can only be initialized by explicitly calling getAuth() or initializeAuth()
             * For why we do this, See go/firebase-next-auth-init
             */
            .setInstantiationMode("EXPLICIT" /* InstantiationMode.EXPLICIT */)
            /**
             * Because all firebase products that depend on auth depend on auth-internal directly,
             * we need to initialize auth-internal after auth is initialized to make it available to other firebase products.
             */
            .setInstanceCreatedCallback((container, _instanceIdentifier, _instance) => {
            const authInternalProvider = container.getProvider("auth-internal" /* _ComponentName.AUTH_INTERNAL */);
            authInternalProvider.initialize();
        }));
        _registerComponent(new Component("auth-internal" /* _ComponentName.AUTH_INTERNAL */, container => {
            const auth = _castAuth(container.getProvider("auth" /* _ComponentName.AUTH */).getImmediate());
            return (auth => new AuthInterop(auth))(auth);
        }, "PRIVATE" /* ComponentType.PRIVATE */).setInstantiationMode("EXPLICIT" /* InstantiationMode.EXPLICIT */));
        registerVersion(name, version, getVersionForPlatform(clientPlatform));
        // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
        registerVersion(name, version, 'esm2020');
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DEFAULT_ID_TOKEN_MAX_AGE = 5 * 60;
    getExperimentalSetting('authIdTokenMaxAge') || DEFAULT_ID_TOKEN_MAX_AGE;
    registerAuth("Browser" /* ClientPlatform.BROWSER */);

    // Background service workers do NOT have localStorage access.
    // We must use initializeAuth + indexedDBLocalPersistence here separately
    // (this is a different bundle/IIFE from popup.js — each has its own Firebase app instance).
    const firebaseConfig = {
      apiKey: "AIzaSyDZcgKpflk-A5d1CISbCZlAJANKgmSeYnc",
      authDomain: "autofill-forms-93b40.firebaseapp.com",
      projectId: "autofill-forms-93b40",
      storageBucket: "autofill-forms-93b40.firebasestorage.app",
      messagingSenderId: "722228471038",
      appId: "1:722228471038:web:65aca2464d18cb79ee31af"
    };

    const app = initializeApp(firebaseConfig);
    const auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence
    });

    console.log("[AutoFill][BG] Service worker started. Listening for auth state...");

    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log(`[AutoFill][BG] ✅ Auth state: signed in uid=${user.uid}`);
        chrome.storage.local.set({ isAuthenticated: true, userUid: user.uid });
      } else {
        console.log("[AutoFill][BG] ❌ Auth state: signed out");
        chrome.storage.local.set({ isAuthenticated: false, userUid: null });
      }
    });

})();
