/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-env jasmine */
'use strict';

const path = require('path');
const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ToxicWebpackManifestPlugin = require('../');
const OUTPUT_DIR = path.join(__dirname, 'dist');

describe('toxic-webpack-manifest-plugin fetch manifest including async chunk', function() {
  it('output manifest including async chunk', function(done) {
    const compiler = webpack({
      entry: {
        js: path.join(__dirname, 'fixtures', 'file.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: 'bundle.js',
        chunkFilename: 'chunk.[chunkhash].js',
        publicPath: '/',
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new ToxicWebpackManifestPlugin(),
      ],
    }, function(err, result) {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      const json = result.compilation.assets['toxic-manifest.json'].source();
      expect(JSON.parse(json)).toEqual({
        js: {
          entry: [
            '/bundle.js',
          ],
          async: [
            '/chunk.8a44f7894fa61bb94736.js',
          ],
        },
      });
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  it('output manifest including async chunk according html-webpack-plugin', function(done) {
    const compiler = webpack({
      entry: {
        js: path.join(__dirname, 'fixtures', 'file.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: 'bundle.js',
        chunkFilename: 'chunk.[chunkhash].js',
        publicPath: '/',
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new ToxicWebpackManifestPlugin({
          htmlAsEntry: true,
        }),
      ],
    }, function(err, result) {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      const json = result.compilation.assets['toxic-manifest.json'].source();
      expect(JSON.parse(json)).toEqual({
        'index.html': {
          entry: [
            '/bundle.js',
          ],
          async: [
            '/chunk.8a44f7894fa61bb94736.js',
          ],
        },
      });
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });
  it('output manifest control by exclude', function(done) {
    const compiler = webpack({
      entry: {
        js: path.join(__dirname, 'fixtures', 'file.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: 'bundle.js',
        chunkFilename: 'chunk.[chunkhash].js',
        publicPath: '/',
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new ToxicWebpackManifestPlugin({
          exclude: /^chunk/,
        }),
      ],
    }, function(err, result) {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      const json = result.compilation.assets['toxic-manifest.json'].source();
      expect(JSON.parse(json)).toEqual({
        js: {
          entry: [
            '/bundle.js',
          ],
          async: [
          ],
        },
      });
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  it('output manifest include only chunk', function(done) {
    const compiler = webpack({
      entry: {
        js: path.join(__dirname, 'fixtures', 'file.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: 'bundle.js',
        chunkFilename: 'chunk.[chunkhash].js',
        publicPath: '/',
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new ToxicWebpackManifestPlugin({
          include: /^chunk/,
        }),
      ],
    }, function(err, result) {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      const json = result.compilation.assets['toxic-manifest.json'].source();
      expect(JSON.parse(json)).toEqual({
        js: {
          entry: [
          ],
          async: [
            '/chunk.8a44f7894fa61bb94736.js',
          ],
        },
      });
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  it('output manifest without async distinction', function(done) {
    const compiler = webpack({
      entry: {
        js: path.join(__dirname, 'fixtures', 'file.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: 'bundle.js',
        chunkFilename: 'chunk.[chunkhash].js',
        publicPath: '/',
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new ToxicWebpackManifestPlugin({
          distinctAsync: false,
        }),
      ],
    }, function(err, result) {
      expect(err).toBeFalsy();
      expect(JSON.stringify(result.compilation.errors)).toBe('[]');
      const json = result.compilation.assets['toxic-manifest.json'].source();
      expect(JSON.parse(json)).toEqual({
        js: [
          '/bundle.js',
          '/chunk.8a44f7894fa61bb94736.js',
        ],
      });
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });
});
