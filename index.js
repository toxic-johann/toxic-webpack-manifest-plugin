'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('toxic-predicate-functions'),
    isEmpty = _require.isEmpty,
    isFunction = _require.isFunction,
    isRegExp = _require.isRegExp,
    isString = _require.isString,
    isArray = _require.isArray;

var fse = require('fs-extra');
var path = require('path');

function dedupe(arr) {
  return Array.from(new Set(arr));
}

var ToxicWebpackManifestPlugin = function () {
  function ToxicWebpackManifestPlugin() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, ToxicWebpackManifestPlugin);

    this.options = Object.assign({
      outputPath: undefined,
      name: 'toxic-manifest.json',
      writeToDisk: false,
      htmlAsEntry: false,
      pretty: true,
      space: 2,
      include: true,
      exclude: false,
      publicPath: undefined,
      distinctAsync: true,
      filenameFormatter: undefined
    }, options);
    this.includer = this.generatePredicateFunctionForFileName(this.options.include);
    this.excluder = this.generatePredicateFunctionForFileName(this.options.exclude);
    this.formatter = isFunction(this.options.filenameFormatter) ? this.options.filenameFormatter : function (filename, publicPath) {
      return publicPath + filename;
    };
  }

  _createClass(ToxicWebpackManifestPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      var htmlChunksMap = {};
      this.compiler = compiler;
      compiler.plugin('compilation', function (compilation) {
        compilation.plugin('html-webpack-plugin-before-html-processing', function (htmlPluginData, callback) {
          htmlChunksMap[htmlPluginData.outputName] = htmlPluginData.plugin.options.chunks;
          callback(null, htmlPluginData);
        });
      });
      compiler.plugin('emit', function (compilation, cb) {
        var chunks = compilation.chunks;
        // fetch the chunk tree of all the chunk
        // clarify the connection with entry chunk and async chunk

        var chunkTree = chunks.reduce(function (tree, chunk) {
          _this.appendBranch({ chunk: chunk, children: [] }, tree);
          return tree;
        }, {});
        // build the manifest based on the chunkTree
        var manifest = Object.values(chunkTree).reduce(function (manifest, branch) {
          var entrypoints = branch.chunk.entrypoints;

          var files = void 0;
          if (_this.options.distinctAsync) {
            var _pieceFilesSetDistinc = _this.pieceFilesSetDistinctAsync(branch),
                entry = _pieceFilesSetDistinc.entry,
                async = _pieceFilesSetDistinc.async;

            files = {
              entry: Array.from(entry),
              async: Array.from(async)
            };
          } else {
            files = Array.from(_this.pieceFilesSet(branch));
          }
          entrypoints.forEach(function (_ref) {
            var name = _ref.name;

            manifest[name] = _this.concatManifestEntry(manifest[name], files);
          });
          return manifest;
        }, {});
        // if user want the manifest based on the html
        // we transfer is for them
        var targetObject = !_this.options.htmlAsEntry ? manifest : Object.entries(htmlChunksMap).reduce(function (htmlManifest, _ref2) {
          var _ref3 = _slicedToArray(_ref2, 2),
              key = _ref3[0],
              chunks = _ref3[1];

          if (chunks === 'all') {
            htmlManifest[key] = manifest;
            return htmlManifest;
          }
          htmlManifest[key] = dedupe(chunks.reduce(function (arr, chunkName) {
            return arr.concat(manifest[chunkName]);
          }, []));
          return htmlManifest;
        }, {});
        var _options = _this.options,
            pretty = _options.pretty,
            space = _options.space;

        var json = pretty ? JSON.stringify(targetObject, null, space) : JSON.stringify(targetObject);
        // get the output file relative postion accroding to info provided by user
        var outputFolder = _this.compiler.options.output.path;
        var outputFile = path.resolve(isString(_this.options.outputPath) ? _this.options.outputPath : outputFolder, _this.options.name);
        var outputName = path.relative(outputFolder, outputFile);
        compilation.assets[outputName] = {
          source: function source() {
            return json;
          },
          size: function size() {
            return json.length;
          }
        };
        if (_this.options.writeToDisk) {
          fse.outputFileSync(outputFile, json);
        }
        cb();
      });
    }

    /**
     * A method to add branch on the chunkTree
     * @param {Object} branch chunkTree branch which looks like { chunk: chunk, children: Array<chunk> }
     * @param {Object} tree A chunk tree
     * @return {void}
     */

  }, {
    key: 'appendBranch',
    value: function appendBranch(branch) {
      var _this2 = this;

      var tree = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var chunk = branch.chunk,
          children = branch.children;
      var id = chunk.id,
          parents = chunk.parents;

      if (isEmpty(parents)) {
        var currentBranch = tree[id];
        if (isEmpty(currentBranch)) {
          tree[id] = branch;
          return;
        }
        if (currentBranch.chunk !== branch.chunk) throw new Error('The chunk is not match!!', currentBranch.chunk, branch.chunk);
        currentBranch.children = (currentBranch.children || []).concat(children || []);
        return;
      }
      parents.forEach(function (parent) {
        var branch = {
          chunk: parent,
          children: [{ chunk: chunk, children: [] }]
        };
        _this2.appendBranch(branch, tree);
      });
      return;
    }

    /**
     * A method to concat file name of a branch of chunk tree
     * @param {Object} branch the branch of chunkTree
     * @param {Set} fileSet the finale set that we will return
     * @return {Set} return a file set
     */

  }, {
    key: 'pieceFilesSet',
    value: function pieceFilesSet(_ref4) {
      var _this3 = this;

      var chunk = _ref4.chunk,
          children = _ref4.children;
      var fileSet = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Set();

      chunk.files.forEach(function (file) {
        if (!_this3.isFileInclude(file)) return;
        fileSet.add(_this3.formatFile(file));
      });
      children.forEach(function (branch) {
        return _this3.pieceFilesSet(branch, fileSet);
      });
      return fileSet;
    }

    /**
     * A method to concat file name of a branch of chunk tree
     * but it will return an Object, which will distince async chunk
     * @param {Object} branch the branch of chunkTree
     * @param {Set} fileSet the finale set that we will return
     * @return {Object} return an object including entry chunk set and async chunk set
     */

  }, {
    key: 'pieceFilesSetDistinctAsync',
    value: function pieceFilesSetDistinctAsync(_ref5) {
      var _this4 = this;

      var chunk = _ref5.chunk,
          children = _ref5.children;
      var fileSet = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        entry: new Set(),
        async: new Set()
      };
      var entry = fileSet.entry,
          async = fileSet.async;

      chunk.files.forEach(function (file) {
        if (!_this4.isFileInclude(file)) return;
        file = _this4.formatFile(file);
        isEmpty(chunk.parents) ? entry.add(file) : async.add(file);
      });
      children.forEach(function (branch) {
        return _this4.pieceFilesSetDistinctAsync(branch, fileSet);
      });
      return fileSet;
    }

    /**
     * check whether a file is needed by user
     * @param {string} file filename
     * @return {boolean} result
     */

  }, {
    key: 'isFileInclude',
    value: function isFileInclude(file) {
      var includer = this.includer,
          excluder = this.excluder;

      return includer(file) && !excluder(file);
    }

    /**
     * change anything into an predicate functions to check file name
     * boolean => boolean
     * number => Boolean(number)
     * string => Regex
     * Regex => Regex
     * Function => Boolean(fn)
     * @param {any} method the method you want to change it into predicate function
     * @return {function} the predicate function
     */

  }, {
    key: 'generatePredicateFunctionForFileName',
    value: function generatePredicateFunctionForFileName(method) {
      return isString(method) ? function (str) {
        return new RegExp(method).test(str);
      } : isRegExp(method) ? function (str) {
        return method.test(str);
      } : isFunction(method) ? function (str) {
        return !!method(str);
      } : function () {
        return !!method;
      };
    }

    /**
     * format the file name, mainly adding public path or running user function
     * @param {string} file name of file
     * @return {string} legal file path
     */

  }, {
    key: 'formatFile',
    value: function formatFile(file) {
      var publicPath = isString(this.options.publicPath) ? this.options.publicPath : this.compiler.options.output.publicPath;
      return this.formatter(file, publicPath);
    }
  }, {
    key: 'concatManifestEntry',
    value: function concatManifestEntry(oldValue, newValue) {
      // when old value is empty, do not need to care about concat
      if (isEmpty(oldValue)) return newValue;
      // do not distinct async chunk
      if (isArray(oldValue) && isArray(newValue)) {
        return dedupe(oldValue.concat(newValue));
      }
      // need to distinct async chunk
      var originEntry = oldValue.entry,
          originAsync = oldValue.async;
      var entry = newValue.entry,
          async = newValue.async;

      return {
        entry: dedupe(originEntry.concat(entry)),
        async: dedupe(originAsync.concat(async))
      };
    }
  }]);

  return ToxicWebpackManifestPlugin;
}();

module.exports = ToxicWebpackManifestPlugin;
