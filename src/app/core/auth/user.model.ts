/** L'utilisateur tel que le front le connaît. Aucun secret : le serveur ne renvoie jamais le hash ni les jetons. */
export interface User {
  id: string;
  name: string;
  email: string;
}

/** Réponse du serveur à POST /auth/login */
export interface AuthResponse {
  token: string;      // JWT signé par le serveur
  expiresAt: number;  // timestamp (ms) de fin de session, calculé par le serveur
  user: User;
}