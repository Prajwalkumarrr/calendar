import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import clientPromise from './mongodb';
import { findUserByEmail } from './users';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — sign-in will fail');
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise, { databaseName: 'elevaite' }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await findUserByEmail(creds.email);
        if (!user || !user.passwordHash) return null;
        if (!user.emailVerified) {
          // Block sign-in until they verify
          throw new Error('email_not_verified');
        }
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user._id.toHexString(),
          email: user.email ?? '',
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    async jwt({ token, trigger, user }) {
      // On first sign-in `user` is populated — fetch persona and cache in token
      if (user || trigger === 'update') {
        const userId = token.sub;
        if (userId) {
          try {
            const { getUserById } = await import('./users');
            const dbUser = await getUserById(userId);
            if (dbUser?.persona) token.persona = dbUser.persona;
          } catch {}
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        // Pass persona from JWT token into the session so client can read it
        if (token.persona) {
          (session.user as { persona?: string }).persona = token.persona as string;
        }
      }
      return session;
    },
  },
};
