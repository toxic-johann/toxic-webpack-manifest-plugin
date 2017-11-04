const { isEmpty, isFunction, isRegExp, isString } = require('toxic-predicate-functions');
const fse = require('fs-extra');
const path = require('path');
const mutexify = require('mutexify');
const lock = mutexify();

function dedupe(arr) {
  return Array.from(new Set(arr));
}

class ToxicWebpackManifestPlugin {
  constructor(options = {}) {
    this.options = Object.assign({
      outputPath: '',
      name: 'toxic-manifest.json',
      writeToDisk: false,
      htmlAsEntry: false,
      pretty: true,
      space: 2,
      include: true,
      exclude: false,
      publicPath: undefined,
      distinctAsync: true,
      filenameFormatter: undefined,
    }, options);
    this.includer = this.generatePredicateFunctionForFileName(this.options.include);
    this.excluder = this.generatePredicateFunctionForFileName(this.options.exclude);
    this.formatter = isFunction(this.options.filenameFormatter)
      ? this.options.filenameFormatter
      : (filename, publicPath) => (publicPath + filename);
  }

  apply(compiler) {
    const htmlChunksMap = {};
    this.compiler = compiler;
    compiler.plugin('compilation', function(compilation) {
      compilation.plugin('html-webpack-plugin-before-html-processing', function(htmlPluginData, callback) {
        htmlChunksMap[htmlPluginData.outputName] = htmlPluginData.plugin.options.chunks;
        callback(null, htmlPluginData);
      });
    });
    compiler.plugin('emit', (compilation, cb) => {
      const { chunks } = compilation;
      // fetch the chunk tree of all the chunk
      // clarify the connection with entry chunk and async chunk
      const chunkTree = chunks.reduce((tree, chunk) => {
        this.appendBranch({ chunk, children: [] }, tree);
        return tree;
      }, {});
      // build the manifest based on the chunkTree
      const manifest = Object.values(chunkTree).reduce((manifest, branch) => {
        const { chunk: { entrypoints } } = branch;
        if (this.options.distinctAsync) {
          const { entry, async } = this.pieceFilesSetDistinctAsync(branch);
          const fileSet = {
            entry: Array.from(entry),
            async: Array.from(async),
          };
          entrypoints.forEach(({ name }) => {
            if (isEmpty(manifest[name])) {
              manifest[name] = fileSet;
              return;
            }
            const { entry: originEntry, async: originAsync } = manifest[name];
            manifest[name] = {
              entry: dedupe(originEntry.concat(fileSet.entry)),
              async: dedupe(originAsync.concat(fileSet.async)),
            };
          });
        } else {
          const files = Array.from(this.pieceFilesSet(branch));
          entrypoints.forEach(({ name }) => {
            manifest[name] = dedupe((manifest[name] || []).concat(files));
          });
        }
        return manifest;
      }, {});
      // if user want the manifest based on the html
      // we transfer is for them
      const targetObject = !this.options.htmlAsEntry
        ? manifest
        : Object.entries(htmlChunksMap).reduce((htmlManifest, [ key, chunks ]) => {
          htmlManifest[key] = dedupe(chunks.reduce((arr, chunkName) => {
            return arr.concat(manifest[chunkName]);
          }, []));
          return htmlManifest;
        }, []);
      const { pretty, space } = this.options;
      const json = pretty
        ? JSON.stringify(targetObject, null, space)
        : JSON.stringify(targetObject);
      // get the output file relative postion accroding to info provided by user
      const outputFolder = this.compiler.options.output.path;
      const outputFile = path.resolve(isString(this.options.outputPath)
        ? this.options.outputPath
        : outputFolder, this.options.name);
      const outputName = path.relative(outputFolder, outputFile);
      compilation.assets[outputName] = {
        source() {
          return json;
        },
        size() {
          return json.length;
        },
      };
      if (this.options.writeToDisk) {
        fse.outputFileSync(outputFile, json);
      }
      // NOTE: make sure webpack is not writing multiple manifests simultaneously
      // lock(function(release) {
      //   compiler.plugin('after-emit', function(compilation, cb) {
      //     release();
      //     cb();
      //   });

      //   compilation.applyPluginsAsync('webpack-manifest-plugin-after-emit', manifest, cb);
      // });
      cb();
    });
  }

  /**
   * A method to add branch on the chunkTree
   * @param {Object} branch chunkTree branch which looks like { chunk: chunk, children: Array<chunk> }
   * @param {Object} tree A chunk tree
   * @return {void}
   */
  appendBranch(branch, tree = {}) {
    const { chunk, children } = branch;
    const { id, parents } = chunk;
    if (isEmpty(parents)) {
      const currentBranch = tree[id];
      if (isEmpty(currentBranch)) {
        tree[id] = branch;
        return;
      }
      if (currentBranch.chunk !== branch.chunk) throw new Error('The chunk is not match!!', currentBranch.chunk, branch.chunk);
      currentBranch.children = (currentBranch.children || []).concat(children || []);
      return;
    }
    parents.forEach(parent => {
      const branch = {
        chunk: parent,
        children: [{ chunk, children: [] }],
      };
      this.appendBranch(branch, tree);
    });
    return;
  }

  /**
   * A method to concat file name of a branch of chunk tree
   * @param {Object} branch the branch of chunkTree
   * @param {Set} fileSet the finale set that we will return
   * @return {Set} return a file set
   */
  pieceFilesSet({ chunk, children }, fileSet = new Set()) {
    // TODO: add some file check here
    chunk.files.forEach(file => {
      if (!this.isFileInclude(file)) return;
      fileSet.add(this.formatFile(file));
    });
    children.forEach(branch => this.pieceFilesSet(branch, fileSet));
    return fileSet;
  }

  /**
   * A method to concat file name of a branch of chunk tree
   * but it will return an Object, which will distince async chunk
   * @param {Object} branch the branch of chunkTree
   * @param {Set} fileSet the finale set that we will return
   * @return {Object} return an object including entry chunk set and async chunk set
   */
  pieceFilesSetDistinctAsync({ chunk, children }, fileSet = {
    entry: new Set(),
    async: new Set(),
  }) {
    const { entry, async } = fileSet;
    chunk.files.forEach(file => {
      if (!this.isFileInclude(file)) return;
      file = this.formatFile(file);
      isEmpty(chunk.parents)
        ? entry.add(file)
        : async.add(file);
    });
    children.forEach(branch => this.pieceFilesSetDistinctAsync(branch, fileSet));
    return fileSet;
  }

  /**
   * check whether a file is needed by user
   * @param {string} file filename
   * @return {boolean} result
   */
  isFileInclude(file) {
    const { includer, excluder } = this;
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
  generatePredicateFunctionForFileName(method) {
    return isString(method)
      ? str => (new RegExp(method)).test(str)
      : isRegExp(method)
        ? str => method.test(str)
        : isFunction(method)
          ? str => !!method(str)
          : () => !!method;
  }

  /**
   * format the file name, mainly adding public path or running user function
   * @param {string} file name of file
   * @return {string} legal file path
   */
  formatFile(file) {
    const publicPath = isString(this.options.publicPath)
      ? this.options.publicPath
      : this.compiler.options.output.publicPath;
    return this.formatter(file, publicPath);
  }
}
module.exports = ToxicWebpackManifestPlugin;
