/*!
 * ectad 
 * 
 * Modified ECT by Andrey Drozdov (c) 2017
 */
"use strict";
var fs = require('fs');
var cs = require('coffee-script');

// var renderFunc = (template, data, callback) => {
// 	var context;
// 	var ect = new EctAd();

// 	// Set up options.root from Express settings.views as soon as we get it
// 	if (data.settings && data.settings.views) {
// 		ect.options.root = data.settings.views;
// 	}

// 	// Ok, now we may render
// 	if (typeof arguments[arguments.length - 1] === 'function') {
// 		if (arguments.length === 2) {
// 			callback = data;
// 			data = {};
// 		}
// 		context = new TemplateContext(data, ect);
// 		try {
// 			var res = context.render(template);
// 			callback(undefined, res);
// 			return res;
// 		} catch (e) {
// 			callback(e);
// 		}
// 	} else {
// 		context = new TemplateContext(data, ect);
// 		var res = context.render(template);
// 		callback(undefined, res);
// 		return res;
// 	}
// }

class EctAd {

	constructor(opt) {
		this.options = {
			open : '<%',
			close : '%>',
			ext : '',
			cache : false,
			watch : false,
			root : ''
		};

		this.watchers = {};
		this.cache = {};

		this.configure(opt);

		// Special arrow declaration to bind the function to the object
		this.render = (template, data, callback) => {
			var context;

			// Set up options.root from Express settings.views as soon as we get it
			if (data.settings && data.settings.views) {
				this.options.root = data.settings.views;
			}

			// Ok, now we may render
			if (typeof arguments[arguments.length - 1] === 'function') {
				if (arguments.length === 2) {
					callback = data;
					data = {};
				}
			}
			context = new TemplateContext(data, this);
			try {
				var res = context.render(template);
				callback(undefined, res);
				return res;
			} catch (e) {
				callback(e);
			}
		}
	}

	read(file) {
		if (Object.prototype.toString.call(this.options.root) === '[object Object]') {
			var data = file.split('.').reduce(function (currentContext, key) { return currentContext[key]; }, this.options.root);
			if (Object.prototype.toString.call(data) === '[object String]') {
				return data;
			} else {
				throw new Error ('Failed to load template ' + file);
			}
		} else {
			try {
				return fs.readFileSync(file, 'utf8');
			} catch (e) {
				throw new Error ('Failed to load template ' + file);
			}
		}
	}

	compile(template) {
		var
			lineNo = 1,
			bufferStack = [ '__ectOutput' ], bufferStackPointer = 0,
			buffer = bufferStack[bufferStackPointer] + ' = \'',
			matches = template.split(new RegExp(EctHelper.regExpEscape(this.options.open) + '((?:.|[\r\n])+?)(?:' + EctHelper.regExpEscape(this.options.close) + '|$)')),
			output, text, command, line,
			prefix, postfix, newline,
			indentChar, indentation = '', indent = false, indentStack = [], indentStackPointer = -1, baseIndent, lines, j;
		const 
			trimExp = /^[ \t]+|[ \t]+$/g,
			newlineExp = /\n/g,
			indentChars = { ':' : ':', '>' : '>' };

		for (var i = 0; i < matches.length; i++) {
			text = matches[i];
			command = '';
			if (i % 2 === 1) {
				line = '__ectFileInfo.line = ' + lineNo;
				switch (text.charAt(0)) {
				case '=':
					prefix = '\' + (' + line + '\n\'\') + __ectTemplateContext.escape(';
					postfix = ') + \'';
					newline = '';
					text = text.substr(1);
					output = 'escaped';
					break;
				case '-':
					prefix = '\' + (' + line + '\n\'\') + ((';
					postfix = ') ? \'\') + \'';
					newline = '';
					text = text.substr(1);
					output = 'unescaped';
					break;
				default:
					prefix = '\'\n' + line;
					postfix = '\n' + bufferStack[bufferStackPointer] + ' += \'';
					newline = '\n';
					output = 'none';
				}
				text = text.replace(trimExp, '');

				command = text.split(/[^a-z]+/)[0];
				if ((indentChar = indentChars[text.charAt(text.length - 1)])) {
					text = text.replace(/:$/, '').replace(trimExp, '');
					if (indentChar === '>') {
						if (/[$a-z_][0-9a-z_$]*[^=]+(-|=)>/i.test(text.replace(/'.*'|".*"/, ''))) {
							indentStack.push('capture_output_' + output);
							indentStackPointer++;
						}
						bufferStack.push('__ectFunction' + bufferStackPointer);
						bufferStackPointer++;
						postfix = '\n' + bufferStack[bufferStackPointer] + ' = \'';
						command = 'function';
					}
					indentStack.push(command);
					indentStackPointer++;
					indent = true;
				}
				switch (command) {
				case 'include' :
					if (output === 'none') {
						prefix = '\' + (' + line + '\n\'\') + (';
						postfix = ') + \'';
					}
					buffer += prefix.replace(newlineExp, '\n' + indentation) + text + postfix.replace(newlineExp, '\n' + indentation);
					break;
				case 'block' :
					bufferStack.push('__ectTemplateContext.blocks[\'' + text.replace(/block\s+('|")([^'"]+)('|").*/, '$2') + '\']');
					bufferStackPointer++;
					prefix = '\'\n';
					postfix = '\n' + bufferStack[bufferStackPointer] + ' += \'';
					text = 'if ' + text;
					buffer += prefix.replace(newlineExp, '\n' + indentation) + text;
					if (indent) {
						indentation += '  ';
						indent = false;
					}
					buffer += postfix.replace(newlineExp, '\n' + indentation);
					break;
				case 'content' :
					if (output === 'none') {
						prefix = '\' + (' + line + '\n\'\') + (';
						postfix = ') + \'';
					}
					if (text === 'content') {
						text = 'content()'
					}
					buffer += prefix.replace(newlineExp, '\n' + indentation) + text + postfix.replace(newlineExp, '\n' + indentation);
					break;
				case 'end' :
					prefix = '\'';
					switch (indentStack[indentStackPointer]) {
					case 'block' :
						bufferStack.pop();
						bufferStackPointer--;
						prefix = '\'';
						postfix = '\n' + bufferStack[bufferStackPointer] + ' += \'';
						buffer += prefix.replace(newlineExp, '\n' + indentation);
						indentation = indentation.substr(2);
						buffer += postfix.replace(newlineExp, '\n' + indentation);
						break;
					case 'when' :
						postfix = '\n' + bufferStack[bufferStackPointer] + ' += \'\'';
						buffer += prefix.replace(newlineExp, '\n' + indentation) + postfix.replace(newlineExp, '\n' + indentation);
						indentation = indentation.substr(2);
						break;
					case 'function' :
						prefix = '\'\n' + bufferStack[bufferStackPointer];
						buffer += prefix.replace(newlineExp, '\n' + indentation);
						indentation = indentation.substr(2);
						bufferStack.pop();
						bufferStackPointer--;
						postfix = '\n' + bufferStack[bufferStackPointer] + ' += \'';
						switch (indentStack[indentStackPointer - 1]) {
							case 'capture_output_escaped' :
								indentStack.pop();
								indentStackPointer--;
								buffer += ')';
								break;
							case 'capture_output_unescaped' :
								indentStack.pop();
								indentStackPointer--;
								buffer += ') ? \'\')';
								break;
							case 'capture_output_none' :
								indentStack.pop();
								indentStackPointer--;
								break;
						}
						buffer += postfix.replace(newlineExp, '\n' + indentation);
						break;
					case 'switch' :
						prefix = '\n' + line;
					default :
						if (indentStack[indentStackPointer - 1] === 'switch') {
							postfix = '';
						}
						indentation = indentation.substr(2);
						buffer += prefix.replace(newlineExp, '\n' + indentation) + postfix.replace(newlineExp, '\n' + indentation);
					}
					indentStack.pop();
					indentStackPointer--;
					break;
				case 'else' :
					if (indentStack[indentStackPointer - 1] === 'switch') {
						prefix = '';
					} else {
						prefix = '\'';
					}
					buffer += prefix.replace(newlineExp, '\n' + indentation);
					if (indentStack[indentStackPointer - 1] === 'if' || indentStack[indentStackPointer - 1] === 'else' || indentStack[indentStackPointer - 1] === 'unless') {
						indentStack.splice(-2, 1);
						indentStackPointer--;
						indentation = indentation.substr(2);
					}
					buffer += (newline.length ? newline + indentation : '') + text;
					if (indent) {
						indentation += '  ';
						indent = false;
					}
					buffer += postfix.replace(newlineExp, '\n' + indentation);
					break;
				case 'switch' :
					buffer += prefix.replace(newlineExp, '\n' + indentation) + (newline.length ? newline + indentation : '') + text;
					if (indent) {
						indentation += '  ';
						indent = false;
					}
					break;
				case 'when' :
					buffer += (newline.length ? newline + indentation : '') + text;
					if (indent) {
						indentation += '  ';
						indent = false;
					}
					buffer += postfix.replace(newlineExp, '\n' + indentation);
					break;
				case 'extend' :
						text = '__ectExtended = true\n__ectParent = ' + text.replace(/extend\s+/, '');
				default :
					if (/\n/.test(text)) {
						lines = text.split(/\n/);
						buffer += prefix.replace(newlineExp, '\n' + indentation);
						for (j = 0; j < lines.length; j++) {
							if (/^\s*$/.test(lines[j])) {
								continue;
							}
							if (typeof baseIndent === 'undefined') {
								baseIndent = new RegExp('^' + lines[j].substr(0, lines[j].search(/[^\s]/)));
							}
							buffer += (newline.length ? newline + indentation : '') + lines[j].replace(baseIndent, '');
						}
						lines = undefined;
						baseIndent = undefined;
					} else {
						buffer += prefix.replace(newlineExp, '\n' + indentation) + (newline.length ? newline + indentation : '') + text;
					}
					if (indent) {
						indentation += '  ';
						indent = false;
					}
					buffer += postfix.replace(newlineExp, '\n' + indentation);
					break;
				}
			} else {
				if (indentStack[indentStackPointer] !== 'switch') {
					buffer += text.replace(/[\\']/g, '\\$&').replace(/\r/g, '').replace(this.newlineExp, '\\n').replace(/^\\n/, '');
				}
			}
			lineNo += text.split(newlineExp).length - 1;
		}
		buffer += '\'\nif not __ectExtended\n  return __ectOutput\nelse\n  __ectContainer = __ectTemplateContext.load __ectParent\n  __ectFileInfo.file = __ectContainer.file\n  __ectFileInfo.line = 1\n  __ectTemplateContext.childContent = __ectOutput\n  return __ectContainer.compiled.call(this, __ectTemplateContext, __ectFileInfo, include, content, block)';
		buffer = '__ectExtended = false\n' + buffer;
		buffer = '(function __ectTemplate(__ectTemplateContext, __ectFileInfo, include, content, block) {\n return ' + cs.compile(buffer) + '});';

		return eval(buffer);
	}

	configure(options) {
		options = options || {};
		for (var option in options) {
			this.options[option] = options[option];
		}
	}

	clearCache(template) {
		if (template) {
			delete (cache[template]);
		} else {
			cache = {};
		}
	}

	compiler(options) {
		var zlib = require('zlib');
		options = options || {};
		options.root = options.root || '/';
		options.root = '/' + options.root.replace(/^\//, '');
		options.root = options.root.replace(/\/$/, '') + '/';
		var rootExp = new RegExp('^' + EctHelper.regExpEscape(options.root));
		var that = this;
		return function (req, res, next) {
			if (req.method !== 'GET' && req.method !== 'HEAD') {
				return next();
			}
			if (!options.root || req.url.substr(0, options.root.length) === options.root) {
				var template = req.url.replace(rootExp, '');
				try {
					var context = new TemplateContext({},that);
					var container = context.load(template);
					res.setHeader('Content-Type', 'application/x-javascript; charset=utf-8');
					res.setHeader('Last-Modified', container.lastModified);
					if (options.gzip) {
						res.setHeader('Content-Encoding', 'gzip');
						if (container.gzip === null) {
							zlib.gzip(container.source, function (err, buffer) {
								if (!err) {
									container.gzip = buffer;
									res.end(container.gzip);
								} else {
									next(err);
								}
							});
						} else {
							res.end(container.gzip);
						}
					} else {
						res.setHeader('Content-Length', typeof Buffer !== 'undefined' ? Buffer.byteLength(container.source, 'utf8') : container.source.length);
						res.end(container.source);
					}
				} catch (e) {
					next(e);
				}
			} else {
				next();
			}
		}
	}

	filter(fun, thisp) {
		var len = this.length >> 0, res = [], i, val;
		if (typeof fun !== 'function') { throw new TypeError(); }
		for (i = 0; i < len; i++) {
			if (i in this) {
				val = this[i];
				if (fun.call(thisp, val, i, this)) { res.push(val); }
			}
		}
		return res;
	}

	reduce(accumulator) {
		if (this === null || this === undefined) {
			throw new TypeError('Object is null or undefined');
		}
		var i = 0, len = this.length >> 0, curr;
		if (typeof accumulator !== 'function') {
			throw new TypeError('First argument is not callable');
		}
		if (arguments.length < 2) {
			if (len === 0) {
				throw new TypeError('Array length is 0 and no second argument');
			}
			curr = this[0];
			i = 1;
		} else {
			curr = arguments[1];
		}
		while (i < len) {
			if (i in this) {
				curr = accumulator.call(undefined, curr, this[i], i, this);
			}
			++i;
		}
		return curr;
	}

	split(str, separator, limit) {
		if (Object.prototype.toString.call(separator) !== '[object RegExp]') {
			return nativeSplit.call(str, separator, limit);
		}
		var output = [],
			flags = (separator.ignoreCase ? 'i' : '') +
			(separator.multiline ? 'm' : '') +
			(separator.extended ? 'x' : '') +
			(separator.sticky ? 'y' : ''),
			lastLastIndex = 0,
			separator = new RegExp(separator.source, flags + 'g'),
			separator2, match, lastIndex, lastLength;
		str += '';
		if (!compliantExecNpcg) {
			separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
		}
		limit = limit === undef ? -1 >>> 0 :
		limit >>> 0;
		while (match = separator.exec(str)) {
			lastIndex = match.index + match[0].length;
			if (lastIndex > lastLastIndex) {
				output.push(str.slice(lastLastIndex, match.index));
				if (!compliantExecNpcg && match.length > 1) {
					match[0].replace(separator2, function () {
						for (var i = 1; i < arguments.length - 2; i++) {
							if (arguments[i] === undef) {
								match[i] = undef;
							}
						}
					});
				}
				if (match.length > 1 && match.index < str.length) {
					Array.prototype.push.apply(output, match.slice(1));
				}
				lastLength = match[0].length;
				lastLastIndex = lastIndex;
				if (output.length >= limit) {
					break;
				}
			}
			if (separator.lastIndex === match.index) {
				separator.lastIndex++;
			}
		}
		if (lastLastIndex === str.length) {
			if (lastLength || !separator.test('')) {
				output.push('');
			}
		}
		else {
			output.push(str.slice(lastLastIndex));
		}
		return output.length > limit ? output.slice(0, limit) : output;
	}
}

class TemplateContext {
	constructor(data, ectad) {
		this.escapeExp = /[&<>"]/;
		this.escapeAmpExp = /&/g;
		this.escapeLtExp = /</g;
		this.escapeGtExp = />/g;
		this.escapeQuotExp = /"/g;

		this.blocks = {};
		this.data = data || {};
		this.childContent = '';

		this.ectad = ectad;
	}

	escape(text) {
		if (text == null) {
			return '';
		}
		var result = text.toString();
		if (!this.escapeExp.test(result)) {
			return result;
		}
		return result.replace(this.escapeAmpExp, '&#38;').replace(this.escapeLtExp, '&#60;').replace(this.escapeGtExp, '&#62;').replace(this.escapeQuotExp, '&#34;');
	}

	block(name) {
		if (!this.blocks[name]) { this.blocks[name] = ''; }
		return !this.blocks[name].length;
	}

	content(block) {
		if (block && block.length) {
			if (!this.blocks[block]) { return ''; }
			return this.blocks[block];
		} else {
			return this.childContent;
		}
	}

	load(template) {
		var file, compiled, container, data;

		if (this.ectad.options.cache && this.ectad.options.cache[template]) {
			return this.ectad.options.cache[template];
		} else {
			var extExp = new RegExp(EctHelper.regExpEscape(this.ectad.options.ext) + '$');
			if (Object.prototype.toString.call(this.ectad.options.root) === '[object String]') {
				if (typeof process !== 'undefined' && process.platform === 'win32') {
					file = EctHelper.normalizePath((this.ectad.options.root.length && template.charAt(0) !== '/' && template.charAt(0) !== '\\' && !/^[a-zA-Z]:/.test(template) ? (this.ectad.options.root + '/') : '') + template.replace(extExp, '') + this.ectad.options.ext);
				} else {
					file = EctHelper.normalizePath((this.ectad.options.root.length && template.charAt(0) !== '/' ? (this.ectad.options.root + '/') : '') + template.replace(extExp, '') + this.ectad.options.ext);
				}
			} else {
				file = template;
			}

			data = this.ectad.read(file);
			if (data.substr(0, 24) === '(function __ectTemplate(') {
				try {
					compiled = eval(data);
				} catch (e) {
					e.message = e.message + ' in ' + file;
					throw e;
				}
			} else {
				try {
					compiled = this.ectad.compile(data);
				} catch (e) {
					e.message = e.message.replace(/ on line \d+/, '') + ' in ' + file;
					throw e;
				}
			}
			container = { file : file, compiled : compiled, source : '(' + compiled.toString() + ');', lastModified: new Date().toUTCString(), gzip : null };
			if (this.ectad.options.cache) {
				this.ectad.cache[template] = container;
				if (this.ectad.options.watch && typeof this.ectad.watchers[file] === 'undefined') {
					this.ectad.watchers[file] = fs.watch(file, { persistent: false }, function () {
						this.ectad.watchers[file].close();
						delete (this.ectad.watchers[file]);
						delete (this.ectad.cache[template]);
					});
				}
			}
			return container;
		}
	}

	render(template, data) {
		var that = this;

		var container = this.load(template);
		var fileInfo = { file : container.file, line : 1 };

		try {
			var src = container.source;
			var func = container.compiled;
			var res = func.call(
				data || this.data,
				that,
				fileInfo,
				function() { return that.render.apply(that, arguments); },
				function() { return that.content.apply(that, arguments); },
				function() { return that.block.apply(that, arguments); }
			);
			return res;
		} catch (e) {
			if (!/ in /.test(e.message)) {
				e.message = e.message + ' in ' + fileInfo.file + ' on line ' + fileInfo.line;
			}
			throw e;
		}
	}
}

const EctHelper = {
	regExpEscape: function (str) {
		return String(str).replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
	},

	normalizePath: function (path) {
		var
			isAbsolute = path.charAt(0) === '/',
			trailingSlash = path.slice(-1) === '/', 
			normalizeArray = function (parts, allowAboveRoot) {
				var up = 0, i, last;
				for (i = parts.length - 1; i >= 0; i--) {
					last = parts[i];
					if (last === '.') {
						parts.splice(i, 1);
					} else if (last === '..') {
						parts.splice(i, 1);
						up++;
					} else if (up) {
						parts.splice(i, 1);
						up--;
					}
				}
				if (allowAboveRoot) {
					while (up) {
						parts.unshift('..');
						up--;
					}
				}
				return parts;
			};

		var path = normalizeArray(path.split('/').filter(function (p) {
			return !!p;
		}), !isAbsolute).join('/');
		if (!path && !isAbsolute) {
			path = '.';
		}
		if (path && trailingSlash) {
			path += '/';
		}
		return (isAbsolute ? '/' : '') + path;
	}

};

module.exports = EctAd;