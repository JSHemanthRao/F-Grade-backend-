const fs = require('fs');
const path = require('path');

const RESERVED_DIRECTORIES = new Set(['common']);

function normalizeProductModule(productModule, fallbackName) {
  if (!productModule.router) {
    throw new Error(`Product "${fallbackName}" must export a router.`);
  }

  return {
    name: productModule.name || fallbackName,
    displayName: productModule.displayName || fallbackName,
    basePath: productModule.basePath || `/api/${fallbackName}`,
    router: productModule.router,
    openapiSpec: productModule.openapiSpec || null,
  };
}

function loadProducts(srcRoot = path.resolve(__dirname, '..', '..')) {
  const resolvedRoot = path.resolve(srcRoot);
  const srcDirectory = path.join(resolvedRoot, 'src');
  const productRoot = fs.existsSync(srcDirectory) ? srcDirectory : resolvedRoot;

  return fs
    .readdirSync(productRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !RESERVED_DIRECTORIES.has(entry.name))
    .map((entry) => {
      const productEntry = path.join(productRoot, entry.name, 'index.js');

      if (!fs.existsSync(productEntry)) {
        return null;
      }

      return normalizeProductModule(require(productEntry), entry.name);
    })
    .filter(Boolean);
}

module.exports = {
  loadProducts,
};
