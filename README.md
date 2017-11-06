# toxic-webpack-manifest-plugin

[![Build Status](https://img.shields.io/travis/toxic-johann/toxic-webpack-manifest-plugin/master.svg?style=flat-square)](https://travis-ci.org/toxic-johann/toxic-webpack-manifest-plugin.svg?branch=master)
[![Coverage Status](https://img.shields.io/coveralls/toxic-johann/toxic-webpack-manifest-plugin/master.svg?style=flat-square)](https://coveralls.io/github/toxic-johann/toxic-webpack-manifest-plugin?branch=master)
[![npm](https://img.shields.io/npm/v/toxic-webpack-manifest-plugin.svg?colorB=brightgreen&style=flat-square)](https://www.npmjs.com/package/toxic-webpack-manifest-plugin)
[![dependency Status](https://david-dm.org/toxic-johann/toxic-webpack-manifest-plugin.svg)](https://david-dm.org/toxic-johann/toxic-webpack-manifest-plugin)
[![devDependency Status](https://david-dm.org/toxic-johann/toxic-webpack-manifest-plugin/dev-status.svg)](https://david-dm.org/toxic-johann/toxic-webpack-manifest-plugin?type=dev)

This webpack plugin will generate a JSON files for the hashed file version. It include entry  chunk and async chunk. You can split them by entry or if you use [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin), you can sort them according to page.

## Installation

```shell
npm install toxic-webpack-manifest-plugin --save-dev
```

## Usage

```shell
const ToxicWebpackManifestPlugin = require('toxic-webpack-manifest-plugin');
...
{
  plugins: [
    new ToxicWebpackManifestPlugin(),
  ]
}
```

## Options

| Option            | Type                              | Default             | Description                              |
| ----------------- | --------------------------------- | ------------------- | ---------------------------------------- |
| outputPath        | string                            | undefined           | the output path of manifest. we will use the webpack `output.path` as default |
| name              | string                            | toxic-manifest.json | manifest name                            |
| writeToDisk       | boolean                           | false               | Write the manifest to disk using `fs` , it's useful if you are using webpack-dev-server and need to update the file. |
| htmlAsEntry       | boolean                           | false               | If you use [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin), we can split the file accroding to page. |
| pretty            | boolean                           | true                | need to prettify the output json         |
| space             | number                            | 2                   | The number use by JSON.stringify when using pretty. |
| include           | boolean\|Function\|string\|RegExp | true                | To check should we include the file. `true` means include all, `false` means exclude all. The string will be transfer into RegExp, which means only include when it match the RegExp. The function should return  boolean. |
| exclude           | boolean\|Function\|string\|RegExp | false               | the opposite of include                  |
| publicPath        | string                            | undefined           | the publicPath for file, use the webpack `output.publicPath` as default one. |
| distinctAsync     | boolean                           | true                | should we clarify which one is async     |
| filenameFormatter | Function                          | undefined           | You can change the filename if you provide this. You can get the filename  and publicPath |
| entryHtmlFormatter | Function                          | undefined           | You can change the key of object when htmlAsEntry is true |

## example

The manifest example is here.

### default set

```json
{
  "bundle": {
    "entry": [
      "/bundle.js"
    ],
    "async": [
      "/chunk.2ee0460aecebfc572a43.js",
      "/chunk.bee94a217f36937c96aa.js"
    ]
  },
  "vendor": {
    "entry": [
      "/vendor.js"
    ],
    "async": []
  },
  "another": {
    "entry": [
      "/another.js"
    ],
    "async": []
  }
}
```

### html as entry

```json
{
  "index.html": {
    "entry": [
      "/bundle.js",
      "/vendor.js"
    ],
    "async": [
      "/chunk.2ee0460aecebfc572a43.js",
      "/chunk.bee94a217f36937c96aa.js"
    ]
  },
  "another.html": {
    "entry": [
      "/another.js"
    ],
    "async": []
  }
}
```

### do not distinct async

```json
{
  "bundle": [
    "/bundle.js",
    "/chunk.2ee0460aecebfc572a43.js",
    "/chunk.bee94a217f36937c96aa.js"
  ],
  "vendor": [
    "/vendor.js"
  ],
  "another": [
    "/another.js"
  ]
}
```
