const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'public', 'sw-template.js');
const targetPath = path.join(__dirname, '..', 'public', 'sw.js');

try {
  const template = fs.readFileSync(templatePath, 'utf8');

  // Генерируем уникальную версию на основе текущего времени (unix timestamp)
  const version = 'v' + Date.now().toString(36);

  const output = template.replace('__CACHE_VERSION__', version);

  fs.writeFileSync(targetPath, output);
  console.log(`[SW] Успешно сгенерирован sw.js с версией кеша: ${version}`);
} catch (error) {
  console.error('[SW] Ошибка генерации sw.js:', error);
  process.exit(1);
}
