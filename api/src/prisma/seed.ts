import { db } from './db.js';
import * as bcrypt from 'bcrypt';

async function main() {
  console.log('Iniciando seed...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const superAdmin = await db.orm.public.User.create({
    name: 'Super Administrador',
    username: 'admin',
    passwordHash: passwordHash,
    profile: 'SUPERADMINISTRATOR',
  });

  console.log('Superadmin criado com sucesso! Username:', superAdmin.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });