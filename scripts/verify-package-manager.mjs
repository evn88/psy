import { existsSync } from 'node:fs';

const packageManagerUserAgent = process.env.npm_config_user_agent ?? '';
const alternativeLockFiles = ['pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'];

if (packageManagerUserAgent && !packageManagerUserAgent.startsWith('npm/')) {
  console.error(
    `Этот проект использует npm. Обнаружен пакетный менеджер: ${packageManagerUserAgent.split(' ')[0]}. ` +
      'Используйте npm install или npm ci.',
  );
  process.exit(1);
}

const foundAlternativeLockFiles = alternativeLockFiles.filter((fileName) => existsSync(fileName));

if (foundAlternativeLockFiles.length > 0) {
  console.error(
    `Обнаружены lock-файлы другого пакетного менеджера: ${foundAlternativeLockFiles.join(', ')}. ` +
      'Удалите их из проекта и используйте только package-lock.json.',
  );
  process.exit(1);
}
