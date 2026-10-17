import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

// Stockage volontairement simple : un fichier JSON (backend/data/users.json).
// Suffisant pour un projet de cours. En production on le remplacerait par une vraie
// base (PostgreSQL, MongoDB...) : seules les fonctions de CE fichier changeraient.
const DATA_DIR = fileURLToPath(new URL('./data/', import.meta.url));
const FILE = `${DATA_DIR}users.json`;

let users = [];
let saving = Promise.resolve();

// Les écritures sont mises en file : jamais deux écritures du fichier en même temps.
// On écrit dans un fichier temporaire puis on le renomme : l'opération est atomique,
// le fichier réel n'est donc jamais à moitié écrit.
function persist() {
  saving = saving.then(async () => {
    const tmp = `${FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(users, null, 2));
    await rename(tmp, FILE);
  });
  return saving;
}

// Comptes de démonstration (ceux de ton ancien db.json), créés UNE fois au premier démarrage.
// Leur mot de passe est haché : il n'apparaît jamais en clair dans users.json.
const DEMO_USERS = [
  { name: 'Moustapha Diouf', email: 'moustapha@taskflow.dev', password: 'moustapha123' },
  { name: 'Sokhna Diarra', email: 'sokhna@taskflow.dev', password: 'sokhna123' },
  { name: 'Jean Diego', email: 'jean@taskflow.dev', password: 'jean123' },
  { name: 'Mame Aby Diop', email: 'mameaby@taskflow.dev', password: 'mameaby123' },
];

export async function initStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    users = JSON.parse(await readFile(FILE, 'utf8'));
  } catch (err) {
    // Seul "le fichier n'existe pas encore" autorise le seed.
    // Un fichier corrompu doit faire échouer le démarrage, pas être écrasé en silence.
    if (err.code !== 'ENOENT') throw err;
    users = await Promise.all(
      DEMO_USERS.map(async ({ name, email, password }) => ({
        id: randomUUID(),
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        verified: true,
        createdAt: new Date().toISOString(),
      })),
    );
    await persist();
  }
}

export const listUsers = () => users;
export const findByEmail = (email) => users.find((u) => u.email === email);
export const findByVerificationHash = (hash) => users.find((u) => u.verificationHash === hash);
export const findByResetHash = (hash) => users.find((u) => u.resetHash === hash);

export async function createUser(data) {
  const user = { id: randomUUID(), ...data, createdAt: new Date().toISOString() };
  users.push(user);
  await persist();
  return user;
}

export async function updateUser(user, patch) {
  Object.assign(user, patch);
  await persist();
  return user;
}

export async function removeUser(user) {
  users = users.filter((u) => u !== user);
  await persist();
}