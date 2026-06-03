import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import CloudinaryModel from '../models/CloudinaryModel';
import { auth, db, firebaseEnabled } from '../utils/firebase';

export type UserAccount = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
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
    this.assertFirebaseReady();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName =
      displayName.trim() || cleanEmail.split('@')[0] || 'Player';
    this.validateCredentials(cleanEmail, password);

    const credential = await createUserWithEmailAndPassword(
      auth!,
      cleanEmail,
      password,
    );
    await updateProfile(credential.user, { displayName: cleanName });
    const account = this.fromFirebaseUser(
      credential.user.uid,
      cleanEmail,
      cleanName,
    );
    await setDoc(doc(db!, 'users', account.id), {
      ...account,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    this.currentAccount = account;
    return account;
  }

  async login(email: string, password: string): Promise<UserAccount> {
    this.assertFirebaseReady();
    const cleanEmail = email.trim().toLowerCase();
    this.validateCredentials(cleanEmail, password);

    const credential = await signInWithEmailAndPassword(
      auth!,
      cleanEmail,
      password,
    );
    const profile = await this.loadProfile(credential.user.uid);
    const account =
      profile ||
      this.fromFirebaseUser(
        credential.user.uid,
        cleanEmail,
        credential.user.displayName || cleanEmail.split('@')[0],
      );
    this.currentAccount = account;
    return account;
  }

  async updateAvatar(
    account: UserAccount,
    imageUri: string,
  ): Promise<UserAccount> {
    this.assertFirebaseReady();
    const upload = await CloudinaryModel.uploadImage(imageUri);
    const updatedAccount = { ...account, avatarUrl: upload.url };
    this.currentAccount = updatedAccount;

    await updateDoc(doc(db!, 'users', account.id), {
      avatarUrl: upload.url,
      updatedAt: new Date().toISOString(),
    });

    return updatedAccount;
  }

  async updateScoreStats(
    account: UserAccount,
    score: number,
  ): Promise<UserAccount> {
    this.assertFirebaseReady();
    const updatedAccount: UserAccount = {
      ...account,
      gamesPlayed: account.gamesPlayed + 1,
      totalScore: account.totalScore + score,
      bestScore: Math.max(account.bestScore, score),
    };
    this.currentAccount = updatedAccount;

    await setDoc(
      doc(db!, 'users', account.id),
      {
        ...updatedAccount,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return updatedAccount;
  }

  async signOut() {
    if (firebaseEnabled && auth) {
      await firebaseSignOut(auth);
    }
    this.currentAccount = null;
  }

  private async loadProfile(userId: string): Promise<UserAccount | null> {
    this.assertFirebaseReady();
    const snapshot = await getDoc(doc(db!, 'users', userId));
    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as UserAccount;
  }

  private fromFirebaseUser(
    id: string,
    email: string,
    displayName: string,
  ): UserAccount {
    return {
      id,
      email,
      displayName,
      gamesPlayed: 0,
      totalScore: 0,
      bestScore: 0,
    };
  }

  private validateCredentials(email: string, password: string) {
    if (!email.includes('@')) {
      throw new Error('Email invalide.');
    }
    if (password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caracteres.');
    }
  }

  private assertFirebaseReady() {
    if (!firebaseEnabled || !auth || !db) {
      throw new Error(
        'Firebase doit etre configure pour utiliser les comptes reels.',
      );
    }
  }
}

export default new AuthController();
