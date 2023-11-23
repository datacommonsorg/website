const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const sharp = require('sharp');

module.exports = {
  devtool: false, // No source maps
  entry: {
    'overrides': './one/scss/overrides.scss',
  },
  output: {
    path: path.resolve(__dirname, 'one/css'),
    filename: '[name].css.js', // This will still be produced initially
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: false, // Make sure source maps are disabled
              importLoaders: 2, // Number of loaders applied before CSS loader
              url: false,
            },
          },
          {
            loader: 'postcss-loader', // Add this loader
            options: {
              postcssOptions: {
                plugins: [
                  ['postcss-discard-comments', { removeAll: true }], // This plugin discards comments
                  require('autoprefixer'), // Add Autoprefixer
                ],
              },
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: false, // Make sure source maps are disabled
            },
          },
        ],
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          emit: false  // Do not emit files, just keep the URL as it is
        }
      },
    ],
  },
  optimization: {
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CleanWebpackPlugin({
      // Automatically remove all unused webpack assets on rebuild, 
      // this means that the .js files will be deleted after they are created.
      cleanStaleWebpackAssets: true,
      protectWebpackAssets: false, // This allows the plugin to remove the .js files
      // Clean only the .js files in the specified directory
      cleanAfterEveryBuildPatterns: ['*.js'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        // Copy the overrides.css file
        { from: 'one/css/overrides.css', to: path.resolve(__dirname, '../custom_dc/one/overrides.css') },
        { from: 'one/css/overrides.css', to: path.resolve(__dirname, '../../server/dist/custom_dc/one/overrides.css') },
        // Copy the fonts directory
        { from: 'one/fonts', to: path.resolve(__dirname, '../custom_dc/one/fonts') },
        { from: 'one/fonts', to: path.resolve(__dirname, '../../server/dist/custom_dc/one/fonts') },
        // Copy the favicon directory
        { from: 'one/favicon', to: path.resolve(__dirname, '../custom_dc/one/favicon') },
        { from: 'one/favicon', to: path.resolve(__dirname, '../../server/dist/custom_dc/one/favicon') },
        // Copy the img directory
        {
          from: 'one/img',
          to: path.resolve(__dirname, '../custom_dc/one/[name].webp'),
          transform(content, path) {
            if (/\.(jpe?g|png)$/i.test(path)) {
              // Adjust compression settings as needed
              return sharp(content)
                .webp({ lossless: true })
                .toBuffer();
            }
            return content; // Return original content if not a JPEG or PNG
          },
        },
        {
          from: 'one/img',
          to: path.resolve(__dirname, '../../server/dist/custom_dc/one/[name].webp'),
          transform(content, path) {
            if (/\.(jpe?g)$/i.test(path)) {
              return sharp(content)
                .webp({ lossless: true })
                .toBuffer();
            }
            return content;
          },
        },
        // Copy the climate-finance files
        { from: 'node_modules/one-climate-story/docs/', to: path.resolve(__dirname, '../custom_dc/one/climate-finance') },
        { from: 'node_modules/one-climate-story/docs/', to: path.resolve(__dirname, '../../server/dist/custom_dc/one/climate-finance') },
      ],
    }),
  ],
};
