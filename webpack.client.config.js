const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const WebpackAssetsManifest = require('webpack-assets-manifest');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const nodeExternals = require('webpack-node-externals');

const ROOT_DIR = path.resolve(__dirname, './');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const reScript = /\.(js|jsx|mjs)$/;
const reStyle = /\.(css|less|styl|scss|sass)$/;
const reImage = /\.(bpm|gif|jpg|jpeg|png|svg)$/;
const staticAssetName = 'assets/[name].[ext]';
const BUILD_DIR = path.resolve(__dirname, 'dist');

const resolve = {
  modules: ['node_modules'],
  alias: {
    '~': SRC_DIR
  },
}

module.exports = {
  context: ROOT_DIR,
  mode: 'development',
  devtool: 'cheap-module-inline-source-map',
  name: 'client',
  resolve,
  entry: {
    client: [
      'webpack-hot-middleware/client',
      path.resolve(SRC_DIR, 'client.js'),
    ],
  },
  target: 'web',
  output: {
    path: BUILD_DIR,
    filename: 'assets/[name].js',
    publicPath: 'http://cdn.cn/',
    chunkFilename: 'assets/[name].chunk.js',
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          chunks: 'initial',
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          }, {
            loader: "css-loader",
            options: {
              sourceMap: false,
              modules: true,
              localIdentName: '[path]_[local]',
              exportOnlyLocals: true,
            }
          },
        ]
      },
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "./src/"),
        ],
        loader: "babel-loader",
        options: {
          babelrc: false,
          cacheDirectory: false,
          presets: [
            [
              "@babel/env",
              {
                targets: "> 0.25%, not dead",
                modules: false,
                useBuiltIns: false,
              },
            ], [
              "@babel/preset-react",
              {
                development: true,
              },
            ],
          ],
          plugins: [
            ["@babel/plugin-proposal-decorators", { legacy: true }],
            ["@babel/plugin-proposal-class-properties", { loose: true }],
            ["@babel/plugin-transform-runtime"],
            ["react-hot-loader/babel"],
            "@babel/plugin-syntax-dynamic-import",
            "@babel/plugin-syntax-import-meta",
          ],
        },
      },
      {
        test: reImage,
        oneOf: [
          // Inline lightweight images into CSS
          {
            issuer: reStyle,
            oneOf: [
              // Inline lightweight SVGs as UTF-8 encoded DataUrl string
              {
                test: /\.svg$/,
                loader: 'svg-url-loader',
                options: {
                  name: staticAssetName,
                  limit: 4096, // 4kb
                },
              },

              // Inline lightweight images as Base64 encoded DataUrl string
              {
                loader: 'url-loader',
                options: {
                  name: staticAssetName,
                  limit: 4096, // 4kb
                },
              },
            ],
          },

          // Or return public URL to image resource
          {
            loader: 'file-loader',
            options: {
              name: staticAssetName,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __isClient__: true,
    }),
    new webpack.HotModuleReplacementPlugin(),
    new MiniCssExtractPlugin({
      filename: "assets/[name].css",
    }),
    new WebpackAssetsManifest({
      writeToDisk: true,
      output: './manifest.json',
      publicPath: true,
      done: (manifest, stats) => {
        const chunkFileName = `${BUILD_DIR}/chunk-manifest.json`;
        try {
          const fileFilter = file => !file.endsWith('.map');
          const addPath = file => manifest.getPublicPath(file);
          const chunkFiles = stats.compilation.chunkGroups.reduce((acc, c) => {
            acc[c.name] = [
              ...(acc[c.name] || []),
              ...c.chunks.reduce(
                (files, cc) => [
                  ...files,
                  ...cc.files.filter(fileFilter).map(addPath),
                ],
                [],
              ),
            ];
            return acc;
          }, Object.create(null));
          fs.writeFileSync(chunkFileName, JSON.stringify(chunkFiles, null, 2));
        } catch (err) {
          console.error(`ERROR: Cannot write ${chunkFileName}: `, err);
          if (!isDebug) process.exit(1);
        }
      },
    }),
  ],
}