const { isEmpty } = require('toxic-predicate-functions');

class ToxicWebpackManifestPlugin {
  constructor(options = {}) {
    this.options = Object.assign({
    }, options);
  }

  apply(compiler) {
    compiler.plugin('after-emit', ({ chunks }, cb) => {
      // fetch the chunk tree of all the chunk
      // clarify the connection with entry chunk and async chunk
      const chunkTree = chunks.reduce((tree, chunk) => {
        this.appendBranch({ chunk, children: [] }, tree);
        return tree;
      }, {});
      // build the manifest based on the chunkTree
      const manifest = Object.values(chunkTree).reduce((manifest, branch) => {
        const files = this.pieceFilesArray(branch);
        const { chunk: { entrypoints } } = branch;
        entrypoints.forEach(({ name }) => {
          manifest[name] = (manifest[name] || []).concat(files);
        });
        return manifest;
      }, {});
      console.log(manifest);
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      cb();
    });
  }

  // append branch on chunkTree
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

  pieceFilesArray({ chunk, children }, arr = []) {
    arr = arr.concat(chunk.files);
    arr = children.reduce((arr, branch) => {
      const piece = this.pieceFilesArray(branch);
      return arr.concat(piece);
    }, arr);
    return arr;
  }
}
module.exports = ToxicWebpackManifestPlugin;
