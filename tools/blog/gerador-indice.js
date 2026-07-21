/* Copia tools/templates/indice.html (shell estático, sem dados de post) para dist/blog/index.html. */
const fs = require('fs');
const path = require('path');

function gerarIndiceBlog(caminhoTemplateIndice, caminhoDistIndice) {
  fs.mkdirSync(path.dirname(caminhoDistIndice), { recursive: true });
  fs.copyFileSync(caminhoTemplateIndice, caminhoDistIndice);
}

module.exports = { gerarIndiceBlog };
