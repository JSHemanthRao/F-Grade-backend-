const app = require('./src/app');
console.log('app type', typeof app);
console.log('keys', Object.keys(app).slice(0, 50));
console.log('stack length', app.stack ? app.stack.length : 'no stack');
console.log('router available', !!app._router);
console.log('router stack entries', (app._router && app._router.stack ? app._router.stack.length : 'n/a'));
if (app._router && app._router.stack) {
  app._router.stack.forEach((layer, index) => {
    if (layer.route) {
      console.log(index, 'route', layer.route.path);
    } else if (layer.name === 'router') {
      console.log(index, 'router', layer.regexp.toString());
    }
  });
}
