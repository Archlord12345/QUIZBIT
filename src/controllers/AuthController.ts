import CloudinaryModel from '../models/CloudinaryModel';
import { apiPost } from '../utils/api';

export type UserAccount = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  idToken?: string;
};

type AuthResponse = {
  ok: boolean;
  account: UserAccount;
};

class AuthController {
  private currentAccount: UserAccount | null = null;

  getCurrentAccount() {
    return this.currentAccount;
  }

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<UserAccount> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName =
      displayName.trim() || cleanEmail.split('@')[0] || 'Player';
    this.validateCredentials(cleanEmail, password);

    const response = await apiPost<AuthResponse>('/api/auth-register', {
      email: cleanEmail,
      password,
      displayName: cleanName,
    });
    this.currentAccount = response.account;
    return response.account;
  }

  async login(email: string, password: string): Promise<UserAccount> {
    const cleanEmail = email.trim().toLowerCase();
    this.validateCredentials(cleanEmail, password);

    const response = await apiPost<AuthResponse>('/api/auth-login', {
      email: cleanEmail,
      password,
    });
    this.currentAccount = response.account;
    return response.account;
  }

  async updateAvatar(
    account: UserAccount,
    imageUri: string,
  ): Promise<UserAccount> {
    this.assertAuthenticated(account);
    const upload = await CloudinaryModel.uploadImage(imageUri);
    const response = await apiPost<AuthResponse>('/api/user-update-avatar', {
      idToken: account.idToken,
      userId: account.id,
      avatarUrl: upload.url,
    });
    this.currentAccount = response.account;
    return response.account;
  }

  async updateScoreStats(
    account: UserAccount,
    score: number,
  ): Promise<UserAccount> {
    this.assertAuthenticated(account);
    const response = await apiPost<AuthResponse>('/api/user-update-stats', {
      idToken: account.idToken,
      userId: account.id,
      score,
    });
    this.currentAccount = response.account;
    return response.account;
  }

  async signOut() {
    this.currentAccount = null;
  }

  private validateCredentials(email: string, password: string) {
    if (!email.includes('@')) {
      throw new Error('Email invalide.');
    }
    if (password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caracteres.');
    }
  }

  private assertAuthenticated(account: UserAccount) {
    if (!account.idToken) {
      throw new Error('Session Vercel/Firebase manquante. Reconnecte-toi.');
    }
  }
}

export default new AuthController();
