const app = require('./src/app');
const layers = app._router.stack || [];
for (const layer of layers) {
  if (layer.route) {
    console.log('route', layer.route.path);
  } else if (layer.name === 'router') {
    console.log('router', layer.regexp.toString());
  }
}
