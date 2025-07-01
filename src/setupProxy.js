// setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'https://api.odaklojistik.com.tr',
            changeOrigin: true,
            secure: false
        })
    );
};
