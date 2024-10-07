const webpack = require('webpack');
module.exports = {
  module: {
    rules: [
      {
        test: /\.(jpg|png)$/,
        use: {
          loader: 'file-loader',
          options: {
            emitFile: true,
            esModule: false,
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      STABLE_FEATURE: JSON.stringify(true),
      EXPERIMENTAL_FEATURE: JSON.stringify(false),
    }),
  ],
};
