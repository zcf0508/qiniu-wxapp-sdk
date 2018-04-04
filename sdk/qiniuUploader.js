// created by gpake
(function () {

    var config = {
        qiniuRegion: '',
        qiniuImageURLPrefix: '',
        qiniuUploadToken: '',
        qiniuUploadTokenURL: '',
        qiniuUploadTokenFunction: null,
        qiniuShouldUseQiniuFileName: false
    }

    module.exports = {
        init: init,
        upload: upload,
        getLocalToken: getLocalToken
    }

    // 在整个程序生命周期中，只需要 init 一次即可
    // 如果需要变更参数，再调用 init 即可
    function init(options) {
        config = {
            qiniuRegion: '',
            qiniuImageURLPrefix: '',
            qiniuUploadToken: '',
            qiniuUploadTokenURL: '',
            qiniuUploadTokenFunction: null,
            qiniuShouldUseQiniuFileName: false
        };
        updateConfigWithOptions(options);
    }

    function updateConfigWithOptions(options) {
        if (options.region) {
            config.qiniuRegion = options.region;
        } else {
            console.error('qiniu uploader need your bucket region');
        }
        if (options.uptoken) {
            config.qiniuUploadToken = options.uptoken;
        } else if (options.uptokenURL) {
            config.qiniuUploadTokenURL = options.uptokenURL;
        } else if (options.uptokenFunc) {
            config.qiniuUploadTokenFunction = options.uptokenFunc;
        }
        if (options.domain) {
            config.qiniuImageURLPrefix = options.domain;
        }
        config.qiniuShouldUseQiniuFileName = options.shouldUseQiniuFileName
    }

    function upload(filePath, success, fail, options, progress) {
        if (null == filePath) {
            console.error('qiniu uploader need filePath to upload');
            return;
        }
        if (options) {
            updateConfigWithOptions(options);
        }
        if (config.qiniuUploadToken) {
            doUpload(filePath, success, fail, options, progress);
        } else if (config.qiniuUploadTokenURL) {
            getQiniuToken(function () {
                doUpload(filePath, success, fail, options, progress);
            });
        } else if (config.qiniuUploadTokenFunction) {
            config.qiniuUploadToken = config.qiniuUploadTokenFunction();
            if (null == config.qiniuUploadToken && config.qiniuUploadToken.length > 0) {
                console.error('qiniu UploadTokenFunction result is null, please check the return value');
                return
            }
            doUpload(filePath, success, fail, options, progress);
        } else {
            console.error('qiniu uploader need one of [uptoken, uptokenURL, uptokenFunc]');
            return;
        }
    }

    function doUpload(filePath, success, fail, options, progress) {
        if (null == config.qiniuUploadToken && config.qiniuUploadToken.length > 0) {
            console.error('qiniu UploadToken is null, please check the init config or networking');
            return
        }
        var url = uploadURLFromRegionCode(config.qiniuRegion);
        var fileName = filePath.split('//')[1];
        if (options && options.key) {
            fileName = options.key;
        }
        var formData = {
            'token': config.qiniuUploadToken
        };
        if (!config.qiniuShouldUseQiniuFileName) {
            formData['key'] = fileName
        }
        var uploadTask = wx.uploadFile({
            url: url,
            filePath: filePath,
            name: 'file',
            formData: formData,
            success: function (res) {
                var dataString = res.data
                if (res.data.hasOwnProperty('type') && res.data.type === 'Buffer') {
                    dataString = String.fromCharCode.apply(null, res.data.data)
                }
                try {
                    var dataObject = JSON.parse(dataString);
                    //do something
                    var imageUrl = config.qiniuImageURLPrefix + '/' + dataObject.key;
                    dataObject.imageURL = imageUrl;
                    console.log(dataObject);
                    if (success) {
                        success(dataObject);
                    }
                } catch (e) {
                    console.log('parse JSON failed, origin String is: ' + dataString)
                    if (fail) {
                        fail(e);
                    }
                }
            },
            fail: function (error) {
                console.error(error);
                if (fail) {
                    fail(error);
                }
            }
        })

        uploadTask.onProgressUpdate((res) => {
            progress && progress(res)
        })
    }

    function getQiniuToken(callback) {
        wx.request({
            url: config.qiniuUploadTokenURL,
            success: function (res) {
                var token = res.data.uptoken;
                if (token && token.length > 0) {
                    config.qiniuUploadToken = token;
                    if (callback) {
                        callback();
                    }
                } else {
                    console.error('qiniuUploader cannot get your token, please check the uptokenURL or server')
                }
            },
            fail: function (error) {
                console.error('qiniu UploadToken is null, please check the init config or networking: ' + error);
            }
        })
    }

    function uploadURLFromRegionCode(code) {
        var uploadURL = null;
        switch (code) {
            case 'ECN': uploadURL = 'https://up.qbox.me'; break;
            case 'NCN': uploadURL = 'https://up-z1.qbox.me'; break;
            case 'SCN': uploadURL = 'https://up-z2.qbox.me'; break;
            case 'NA': uploadURL = 'https://up-na0.qbox.me'; break;
            case 'ASG': uploadURL = 'https://up-as0.qbox.me'; break;
            default: console.error('please make the region is with one of [ECN, SCN, NCN, NA, ASG]');
        }
        return uploadURL;
    }

    /**
     * author:zcf0508
     * 
     * 在本地获取上传token
     * 使用方法: 直接调用getLocalToken()方法
     * @param access_key: AK
     * @param secret_key: SK
     * @param bucketname：bucket名称
     * 
     * @return 返回token
    */
    function getLocalToken(access_key, secret_key, bucketname) {

        var CryptoJS = function (g, l) {
            var e = {}, d = e.lib = {}, m = function () { }, k = d.Base = { extend: function (a) { m.prototype = this; var c = new m; a && c.mixIn(a); c.hasOwnProperty("init") || (c.init = function () { c.$super.init.apply(this, arguments) }); c.init.prototype = c; c.$super = this; return c }, create: function () { var a = this.extend(); a.init.apply(a, arguments); return a }, init: function () { }, mixIn: function (a) { for (var c in a) a.hasOwnProperty(c) && (this[c] = a[c]); a.hasOwnProperty("toString") && (this.toString = a.toString) }, clone: function () { return this.init.prototype.extend(this) } },
            p = d.WordArray = k.extend({
                init: function (a, c) { a = this.words = a || []; this.sigBytes = c != l ? c : 4 * a.length }, toString: function (a) { return (a || n).stringify(this) }, concat: function (a) { var c = this.words, q = a.words, f = this.sigBytes; a = a.sigBytes; this.clamp(); if (f % 4) for (var b = 0; b < a; b++)c[f + b >>> 2] |= (q[b >>> 2] >>> 24 - 8 * (b % 4) & 255) << 24 - 8 * ((f + b) % 4); else if (65535 < q.length) for (b = 0; b < a; b += 4)c[f + b >>> 2] = q[b >>> 2]; else c.push.apply(c, q); this.sigBytes += a; return this }, clamp: function () {
                    var a = this.words, c = this.sigBytes; a[c >>> 2] &= 4294967295 <<
                        32 - 8 * (c % 4); a.length = g.ceil(c / 4)
                }, clone: function () { var a = k.clone.call(this); a.words = this.words.slice(0); return a }, random: function (a) { for (var c = [], b = 0; b < a; b += 4)c.push(4294967296 * g.random() | 0); return new p.init(c, a) }
            }), b = e.enc = {}, n = b.Hex = {
                stringify: function (a) { var c = a.words; a = a.sigBytes; for (var b = [], f = 0; f < a; f++) { var d = c[f >>> 2] >>> 24 - 8 * (f % 4) & 255; b.push((d >>> 4).toString(16)); b.push((d & 15).toString(16)) } return b.join("") }, parse: function (a) {
                    for (var c = a.length, b = [], f = 0; f < c; f += 2)b[f >>> 3] |= parseInt(a.substr(f,
                        2), 16) << 24 - 4 * (f % 8); return new p.init(b, c / 2)
                }
            }, j = b.Latin1 = { stringify: function (a) { var c = a.words; a = a.sigBytes; for (var b = [], f = 0; f < a; f++)b.push(String.fromCharCode(c[f >>> 2] >>> 24 - 8 * (f % 4) & 255)); return b.join("") }, parse: function (a) { for (var c = a.length, b = [], f = 0; f < c; f++)b[f >>> 2] |= (a.charCodeAt(f) & 255) << 24 - 8 * (f % 4); return new p.init(b, c) } }, h = b.Utf8 = { stringify: function (a) { try { return decodeURIComponent(escape(j.stringify(a))) } catch (c) { throw Error("Malformed UTF-8 data"); } }, parse: function (a) { return j.parse(unescape(encodeURIComponent(a))) } },
            r = d.BufferedBlockAlgorithm = k.extend({
                reset: function () { this._data = new p.init; this._nDataBytes = 0 }, _append: function (a) { "string" == typeof a && (a = h.parse(a)); this._data.concat(a); this._nDataBytes += a.sigBytes }, _process: function (a) { var c = this._data, b = c.words, f = c.sigBytes, d = this.blockSize, e = f / (4 * d), e = a ? g.ceil(e) : g.max((e | 0) - this._minBufferSize, 0); a = e * d; f = g.min(4 * a, f); if (a) { for (var k = 0; k < a; k += d)this._doProcessBlock(b, k); k = b.splice(0, a); c.sigBytes -= f } return new p.init(k, f) }, clone: function () {
                    var a = k.clone.call(this);
                    a._data = this._data.clone(); return a
                }, _minBufferSize: 0
            }); d.Hasher = r.extend({
                cfg: k.extend(), init: function (a) { this.cfg = this.cfg.extend(a); this.reset() }, reset: function () { r.reset.call(this); this._doReset() }, update: function (a) { this._append(a); this._process(); return this }, finalize: function (a) { a && this._append(a); return this._doFinalize() }, blockSize: 16, _createHelper: function (a) { return function (b, d) { return (new a.init(d)).finalize(b) } }, _createHmacHelper: function (a) {
                    return function (b, d) {
                        return (new s.HMAC.init(a,
                            d)).finalize(b)
                    }
                }
            }); var s = e.algo = {}; return e
        }(Math);

        (function () {
            var g = CryptoJS, l = g.lib, e = l.WordArray, d = l.Hasher, m = [], l = g.algo.SHA1 = d.extend({
                _doReset: function () { this._hash = new e.init([1732584193, 4023233417, 2562383102, 271733878, 3285377520]) }, _doProcessBlock: function (d, e) {
                    for (var b = this._hash.words, n = b[0], j = b[1], h = b[2], g = b[3], l = b[4], a = 0; 80 > a; a++) {
                        if (16 > a) m[a] = d[e + a] | 0; else { var c = m[a - 3] ^ m[a - 8] ^ m[a - 14] ^ m[a - 16]; m[a] = c << 1 | c >>> 31 } c = (n << 5 | n >>> 27) + l + m[a]; c = 20 > a ? c + ((j & h | ~j & g) + 1518500249) : 40 > a ? c + ((j ^ h ^ g) + 1859775393) : 60 > a ? c + ((j & h | j & g | h & g) - 1894007588) : c + ((j ^ h ^
                            g) - 899497514); l = g; g = h; h = j << 30 | j >>> 2; j = n; n = c
                    } b[0] = b[0] + n | 0; b[1] = b[1] + j | 0; b[2] = b[2] + h | 0; b[3] = b[3] + g | 0; b[4] = b[4] + l | 0
                }, _doFinalize: function () { var d = this._data, e = d.words, b = 8 * this._nDataBytes, g = 8 * d.sigBytes; e[g >>> 5] |= 128 << 24 - g % 32; e[(g + 64 >>> 9 << 4) + 14] = Math.floor(b / 4294967296); e[(g + 64 >>> 9 << 4) + 15] = b; d.sigBytes = 4 * e.length; this._process(); return this._hash }, clone: function () { var e = d.clone.call(this); e._hash = this._hash.clone(); return e }
            }); g.SHA1 = d._createHelper(l); g.HmacSHA1 = d._createHmacHelper(l)
        })();

        (function () {
            var g = CryptoJS, l = g.enc.Utf8; g.algo.HMAC = g.lib.Base.extend({
                init: function (e, d) { e = this._hasher = new e.init; "string" == typeof d && (d = l.parse(d)); var g = e.blockSize, k = 4 * g; d.sigBytes > k && (d = e.finalize(d)); d.clamp(); for (var p = this._oKey = d.clone(), b = this._iKey = d.clone(), n = p.words, j = b.words, h = 0; h < g; h++)n[h] ^= 1549556828, j[h] ^= 909522486; p.sigBytes = b.sigBytes = k; this.reset() }, reset: function () { var e = this._hasher; e.reset(); e.update(this._iKey) }, update: function (e) { this._hasher.update(e); return this }, finalize: function (e) {
                    var d =
                        this._hasher; e = d.finalize(e); d.reset(); return d.finalize(this._oKey.clone().concat(e))
                }
            })
        })();

        var enc = (function () {
            // Shortcuts
            var C = CryptoJS;
            var C_lib = C.lib;
            var WordArray = C_lib.WordArray;
            var C_enc = C.enc;

            /**
             * Base64 encoding strategy.
             */
            var Base64 = C_enc.Base64 = {
                /**
                 * Converts a word array to a Base64 string.
                 *
                 * @param {WordArray} wordArray The word array.
                 *
                 * @return {string} The Base64 string.
                 *
                 * @static
                 *
                 * @example
                 *
                 *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
                 */
                stringify: function (wordArray) {
                    // Shortcuts
                    var words = wordArray.words;
                    var sigBytes = wordArray.sigBytes;
                    var map = this._map;

                    // Clamp excess bits
                    wordArray.clamp();

                    // Convert
                    var base64Chars = [];
                    for (var i = 0; i < sigBytes; i += 3) {
                        var byte1 = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                        var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
                        var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

                        var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

                        for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
                            base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
                        }
                    }

                    // Add padding
                    var paddingChar = map.charAt(64);
                    if (paddingChar) {
                        while (base64Chars.length % 4) {
                            base64Chars.push(paddingChar);
                        }
                    }

                    return base64Chars.join('');
                },

                /**
                 * Converts a Base64 string to a word array.
                 *
                 * @param {string} base64Str The Base64 string.
                 *
                 * @return {WordArray} The word array.
                 *
                 * @static
                 *
                 * @example
                 *
                 *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
                 */
                parse: function (base64Str) {
                    // Shortcuts
                    var base64StrLength = base64Str.length;
                    var map = this._map;
                    var reverseMap = this._reverseMap;

                    if (!reverseMap) {
                        reverseMap = this._reverseMap = [];
                        for (var j = 0; j < map.length; j++) {
                            reverseMap[map.charCodeAt(j)] = j;
                        }
                    }

                    // Ignore padding
                    var paddingChar = map.charAt(64);
                    if (paddingChar) {
                        var paddingIndex = base64Str.indexOf(paddingChar);
                        if (paddingIndex !== -1) {
                            base64StrLength = paddingIndex;
                        }
                    }

                    // Convert
                    return parseLoop(base64Str, base64StrLength, reverseMap);

                },

                _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
            };
            function parseLoop(base64Str, base64StrLength, reverseMap) {
                var words = [];
                var nBytes = 0;
                for (var i = 0; i < base64StrLength; i++) {
                    if (i % 4) {
                        var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
                        var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
                        words[nBytes >>> 2] |= (bits1 | bits2) << (24 - (nBytes % 4) * 8);
                        nBytes++;
                    }
                }
                return WordArray.create(words, nBytes);
            }
        }());


        var Qiniu = {
            _getFlags: function (bucketname) {
                var flags = {
                    "scope": bucketname,
                    "deadline": 3600 + Math.floor(Date.now() / 1000)
                }
                return flags;
            },
            _byteArrayToString: function (byteArray) {
                var string = '', l = byteArray.length, i;
                for (i = 0; i < l; i++) {
                    string += String.fromCharCode(byteArray[i]);
                }
                return string;
            },

            _urlsafeBase64EncodeFlag: function (flags) {
                return this._base64_encode(JSON.stringify(flags));
            },

            _wordsToByteArray: function (words) {
                var bytes = [], i;
                for (i = 0; i < words.length * 32; i += 8) {
                    bytes.push((words[i >>> 5] >>> (24 - i % 32)) & 0xFF);
                }
                return bytes;
            },

            _base64ToUrlSafe: function (v) {
                return v.replace(/\//g, '_').replace(/\+/g, '-');
            },

            getToken: function (access_key, secret_key, bucketname) {
                var flags = this._getFlags(bucketname)
                var encodedFlags = this._urlsafeBase64EncodeFlag(flags);
                var encoded_signed = CryptoJS.HmacSHA1(encodedFlags, secret_key).toString(CryptoJS.enc.Base64);
                encoded_signed = this._base64ToUrlSafe(encoded_signed);
                var uploadToken = access_key + ':' + encoded_signed + ':' + encodedFlags;
                return uploadToken;
            },


            _byteArrayToString: function (byteArray) {
                var string = '', l = byteArray.length, i;
                for (i = 0; i < l; i++) {
                    string += String.fromCharCode(byteArray[i]);
                }
                return string;
            },

            _base64_encode: function (str) {
                var c1, c2, c3;
                var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                var i = 0, len = str.length, string = '';

                while (i < len) {
                    c1 = str.charCodeAt(i++) & 0xff;
                    if (i == len) {
                        string += base64EncodeChars.charAt(c1 >> 2);
                        string += base64EncodeChars.charAt((c1 & 0x3) << 4);
                        string += "==";
                        break;
                    }
                    c2 = str.charCodeAt(i++);
                    if (i == len) {
                        string += base64EncodeChars.charAt(c1 >> 2);
                        string += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
                        string += base64EncodeChars.charAt((c2 & 0xF) << 2);
                        string += "=";
                        break;
                    }
                    c3 = str.charCodeAt(i++);
                    string += base64EncodeChars.charAt(c1 >> 2);
                    string += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
                    string += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
                    string += base64EncodeChars.charAt(c3 & 0x3F);
                }
                return string;
            },
        };

        return Qiniu.getToken(access_key, secret_key, bucketname)
    }

})();
