//
// browser.js - client-side engine
//

var isFileProtocol = (location.protocol === 'file:'    ||
                      location.protocol === 'chrome:'  ||
                      location.protocol === 'chrome-extension:'  ||
                      location.protocol === 'resource:');

less.env = less.env || (location.hostname == '127.0.0.1' ||
                        location.hostname == '0.0.0.0'   ||
                        location.hostname == 'localhost' ||
                        location.port.length > 0         ||
                        isFileProtocol                   ? 'development'
                                                         : 'production');

// Load styles asynchronously (default: false)
//
// This is set to `false` by default, so that the body
// doesn't start loading before the stylesheets are parsed.
// Setting this to `true` can result in flickering.
//
less.async = less.async || false;

// Interval between watch polls
less.poll = less.poll || (isFileProtocol ? 1000 : 1500);

// Show error messages (default: true if development enviroment otherwise false)
//
// This property makes possible to show errors while in production enviroment
less.showErrors = less.showErrors || 'development' === less.env;

//
// Watch mode
//
less.watch   = function () { return this.watchMode = true };
less.unwatch = function () { return this.watchMode = false };

if (less.env === 'development') {
    less.optimization = 0;

    if (/!watch/.test(location.hash)) {
        less.watch();
    }
    less.watchTimer = setInterval(function () {
        if (less.watchMode) {
            loadStyleSheets(function (e, root, _, sheet, env) {
                if (root) {
                    createCSS(root.toCSS(), sheet, env.lastModified);
                }
            });
        }
    }, less.poll);
} else {
    less.optimization = 3;
}

var cache;

try {
    cache = (typeof(window.localStorage) === 'undefined') ? null : window.localStorage;
} catch (_) {
    cache = null;
}

//
// Get all <link> tags with the 'rel' attribute set to "stylesheet/less"
//
var links = document.getElementsByTagName('link'),
    typePattern = /^text\/(x-)?less$/;

less.sheets = [];

for (var i = 0, linksL = links.length; i < linksL; i++) {
    if (links[i].rel === 'stylesheet/less' || links[i].rel.match(/stylesheet/) && links[i].type.match(typePattern)) {
        less.sheets.push(links[i]);
    }
}


less.refresh = function (reload) {
    var startTime, endTime;
    startTime = endTime = new(Date);

    loadStyleSheets(function (e, root, _, sheet, env) {
        if (env.local) {
            log("loading " + sheet.href + " from cache.");
        } else {
            log("parsed " + sheet.href + " successfully.");
            createCSS(root.toCSS(), sheet, env.lastModified);
        }
        log("css for " + sheet.href + " generated in " + (new(Date) - endTime) + 'ms');
        (env.remaining === 0) && log("css generated in " + (new(Date) - startTime) + 'ms');
        endTime = new(Date);
    }, reload);

    loadStyles();
};
less.refreshStyles = loadStyles;

less.refresh(less.env === 'development');

function loadStyles() {
    var styles = document.getElementsByTagName('style');
    for (var i = 0, stylesL = styles.length; i < stylesL; i++) {
        if (styles[i].type.match(typePattern)) {
            new(less.Parser)().parse(styles[i].innerHTML || '', function (e, tree) {
                var css = tree.toCSS(),
                    style = styles[i];
                style.type = 'text/css';
                if (style.styleSheet) {
                    style.styleSheet.cssText = css;
                } else {
                    style.innerHTML = css;
                }
            });
        }
    }
}

function loadStyleSheets(callback, reload) {
    for (var i = 0, sheetsL = less.sheets.length; i < sheetsL; i++) {
        loadStyleSheet(less.sheets[i], callback, reload, less.sheets.length - (i + 1));
    }
}

function loadStyleSheet(sheet, callback, reload, remaining) {
    var url       = window.location.href.replace(/[#?].*$/, ''),
        href      = sheet.href.replace(/\?.*$/, ''),
        css       = cache && cache.getItem(href),
        timestamp = cache && cache.getItem(href + ':timestamp'),
        styles    = { css: css, timestamp: timestamp };

    // Stylesheets in IE don't always return the full path
    if (! /^(https?|file):/.test(href)) {
        href = href.charAt(0) === "/" ?
        window.location.protocol + "//" + window.location.host + href :
        url.slice(0, url.lastIndexOf('/') + 1) + href;
    }
    var filename = href.match(/([^\/]+)$/)[1];

    xhr(sheet.href, sheet.type, function (data, lastModified) {
        if (!reload && styles && lastModified &&
           (new(Date)(lastModified).valueOf() ===
            new(Date)(styles.timestamp).valueOf())) {
            // Use local copy
            createCSS(styles.css, sheet);
            callback(null, null, data, sheet, { local: true, remaining: remaining });
        } else {
            // Use remote copy (re-parse)
            try {
                new(less.Parser)({
                    optimization: less.optimization,
                    paths: [href.replace(/[\w\.-]+$/, '')],
                    mime: sheet.type,
                    filename: filename
                }).parse(data, function (e, root) {
                    if (e) { return error(e, href) }
                    try {
                        callback(e, root, data, sheet, { local: false, lastModified: lastModified, remaining: remaining });
                        removeNode(document.getElementById('less-error:' + extractId(href)));
                    } catch (e) {
                        error(e, href);
                    }
                });
            } catch (e) {
                error(e, href);
            }
        }
    }, function (status, url) {
        throw new(Error)("Couldn't load " + url + " (" + status + ")");
    });
}

function extractId(href) {
    return href.replace(/^[a-z]+:\/\/?[^\/]+/, '' )  // Remove protocol & domain
               .replace(/^\//,                 '' )  // Remove root /
               .replace(/\?.*$/,               '' )  // Remove query
               .replace(/\.[^\.\/]+$/,         '' )  // Remove file extension
               .replace(/[^\.\w-]+/g,          '-')  // Replace illegal characters
               .replace(/\./g,                 ':'); // Replace dots with colons(for valid id)
}

function createCSS(styles, sheet, lastModified) {
    var css;

    // Strip the query-string
    var href = sheet.href ? sheet.href.replace(/\?.*$/, '') : '';

    // If there is no title set, use the filename, minus the extension
    var id = 'less:' + (sheet.title || extractId(href));

    // If the stylesheet doesn't exist, create a new node
    if ((css = document.getElementById(id)) === null) {
        css = document.createElement('style');
        css.type = 'text/css';
        css.media = sheet.media || 'screen';
        css.id = id;
        document.getElementsByTagName('head')[0].appendChild(css);
    }

    if (css.styleSheet) { // IE
        try {
            css.styleSheet.cssText = styles;
        } catch (e) {
            throw new(Error)("Couldn't reassign styleSheet.cssText.");
        }
    } else {
        (function (node) {
            if (css.childNodes.length > 0) {
                if (css.firstChild.nodeValue !== node.nodeValue) {
                    css.replaceChild(node, css.firstChild);
                }
            } else {
                css.appendChild(node);
            }
        })(document.createTextNode(styles));
    }

    // Don't update the local store if the file wasn't modified
    if (lastModified && cache) {
        log('saving ' + href + ' to cache.');
        cache.setItem(href, styles);
        cache.setItem(href + ':timestamp', lastModified);
    }
}

function xhr(url, type, callback, errback) {
    var xhr = getXMLHttpRequest();
    var async = isFileProtocol ? false : less.async;

    if (typeof(xhr.overrideMimeType) === 'function') {
        xhr.overrideMimeType('text/css');
    }
    xhr.open('GET', url, async);
    xhr.setRequestHeader('Accept', type || 'text/x-less, text/css; q=0.9, */*; q=0.5');
    xhr.send(null);

    if (isFileProtocol) {
        if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
            callback(xhr.responseText);
        } else {
            errback(xhr.status, url);
        }
    } else if (async) {
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                handleResponse(xhr, callback, errback);
            }
        };
    } else {
        handleResponse(xhr, callback, errback);
    }

    function handleResponse(xhr, callback, errback) {
        if (xhr.status >= 200 && xhr.status < 300) {
            callback(xhr.responseText, xhr.getResponseHeader("Last-Modified"));
        } else if (typeof(errback) === 'function') {
            errback(xhr.status, url);
        }
    }
}

function getXMLHttpRequest() {
    if (window.XMLHttpRequest) {
        return new(XMLHttpRequest);
    } else {
        try {
            return new(ActiveXObject)("MSXML2.XMLHTTP.3.0");
        } catch (e) {
            log("browser doesn't support AJAX.");
            return null;
        }
    }
}

function removeNode(node) {
    return node && node.parentNode.removeChild(node);
}

function log(str) {
    if (less.env == 'development' && typeof(console) !== "undefined") { console.log('less: ' + str) }
}

function error(e, href) {
    var id = 'less-error:' + extractId(href),
        template = '<span><label>{line}</label><pre class="{class}">{content}</pre></span>',
        elem = document.createElement('div'), timer, content, error = [],
        filename = e.filename || href;

    elem.id        = id;
    elem.className = "less-error";

    content = '<p><i>Powered by <a href="lesscss.org">LESS</a></i>Error in .less file</p>' +
              (e.message ? '<h3>' + e.message + '</h3>' : '') +
              '<p>in <a href="' + filename + '">' + filename + "</a> ";

    var errorline = function (e, i, classname) {
        if (e.extract[i]) {
            error.push(template.replace(/\{line\}/, parseInt(e.line) + (i - 1))
                               .replace(/\{class\}/, classname)
                               .replace(/\{content\}/, e.extract[i]));
        }
    };

    if (e.stack) {
        content += '<br/>' + e.stack.split('\n').slice(1).join('<br/>');
    } else if (e.extract) {
        errorline(e, 0, '');
        errorline(e, 1, 'line');
        errorline(e, 2, '');
        content += 'on line ' + e.line + ', column ' + (e.column + 1) + ':</p>' +
                   '<pre class="less-error-wrap">' + error.join('') + '</pre>';
    }
    elem.innerHTML = content;

    // CSS for error messages
    createCSS([
        '.less-error, .less-error pre.less-error-wrap {',
            'border: 1px solid #e00;',
            '-webkit-border-radius: 5px;',
            '-moz-border-radius: 5px;',
            'border-radius: 5px;',
            'font-family: Arial, sans-serif !important;',
            'font-size: 1em !important;',
        '}',
        '.less-error {',                  
            'background: #eee;',
            'border: 1px solid #e00;',
            'color: #e00;',
            'margin-bottom: 15px;',
            'padding: 10px 16px;',
            'text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);',
            'z-index: 1;',
        '}',
        '.less-error pre.less-error-wrap {',
            'background: #fafafa;',
            'border-color: #aaa;',
            'margin: 5px 0;',
            'overflow: auto;',    
            'padding: 2px 0;',    
        '}',
        '.less-error span {',
            'background: #fafafa;',
            'display: block;',
            'margin: 0;',
            'overflow: visible;',            
            'padding: 2px 0;',            
        '}',
        '.less-error label {',
            'color: #c44;',
            'margin: 0;',
            'padding: 0 1em;',            
        '}',
        '.less-error p, .less-error h3 {',
            'margin: 5px 0;',
            'padding: 0;',
        '}',
        '.less-error p i {',
            'float:right;',
            'font-style:normal;',
        '}',
        '.less-error pre pre {',
            'color: #e66;',
            'display: -moz-inline-stack;',
            'display: inline-block;',
            '*display: inline;',            
            'margin: 0;',
            'padding: 0;',            
        '}',
        '.less-error pre pre.line {',
            'color: #f00;',
        '}',
        '.less-error h3 {',
            'font-size: 1.4em;',
            'font-weight: bold;',
        '}',
        '.less-error a {',
            'color: #10a',
        '}',
        '.less-error .error {',
            'color: #f00;',
            'font-weight: bold;',
            'padding: 0 0 2px 0;',
            'border-bottom: 1px dashed #f00;',
        '}'
    ].join('\n'), { title: 'error-message' });

    if (less.showErrors || 'development' === less.env) {
        timer = setInterval(function () {
            if (document.body) {
                document.getElementById(id) ? document.body.replaceChild(elem, document.getElementById(id)) : document.body.insertBefore(elem, document.body.firstChild);
                clearInterval(timer);
            }
        }, 10);
    }
}

