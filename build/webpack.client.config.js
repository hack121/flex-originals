const webpack = require('webpack');
const merge = require('webpack-merge');
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
const baseConfig = require('./webpack.base.config');
// const SWPrecachePlugin = require('sw-precache-webpack-plugin');
const workboxPlugin = require('workbox-webpack-plugin');

const config = merge(baseConfig, {
  entry: {
    app: './src/entry-client.js',
  },

  optimization: {
    runtimeChunk: {
      // extract webpack runtime & manifest to avoid vendor chunk hash changing
      // on every build.
      name: 'manifest',
    },

    // extract vendor chunks for better caching
    splitChunks: {
      chunks: 'initial',
      cacheGroups: {
        vendor: {
          name: 'vendor',
          test(module) {
            // a module is extracted into the vendor chunk if...
            return (
              // it's inside node_modules
              /node_modules/.test(module.context) &&
              // and not a CSS file
              !/\.css$/.test(module.request)
            );
          },
        },
      },
    },
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.VUE_ENV': '"client"',
      'process.env.APP_API_PORT': process.env.APP_API_PORT,
      'process.env.APP_CDN_PORT': process.env.APP_CDN_PORT,
      'process.browser': true,
      'process.client': true,
      'process.server': false,
    }),

    new VueSSRClientPlugin(),
  ],
});

if (process.env.NODE_ENV === 'production') {
  config.plugins.push(
    new workboxPlugin.GenerateSW({
      swDest: 'sw.js',
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: '/',
          handler: 'NetworkFirst',
        },
      ],
    }),
  );
}

module.exports = config;
