// The purpose of this file is to manage user sessions and authentication.
// This is a module-file that can be disabled if needed.

import { Express } from "express";
import passport from "passport";
import passportLocal from "passport-local";
import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";

import bcrypt from "bcrypt";

import LoggingService from "./logging";
import prismaClient from "../config/prisma";

class SessionManager {
  authStrategies: { [key: string]: passportLocal.Strategy };
  private instance: SessionManager | null = null;

  private sessionMiddleware = session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: "lax",
      httpOnly: false,
    },
    store: new PrismaSessionStore(prismaClient as any, {
      checkPeriod: 2 * 60 * 1000, // Prune expired sessions every 2 minutes
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  });

  constructor() {
    this.authStrategies = {
      local: new passportLocal.Strategy(
        {
          usernameField: "email",
          passwordField: "password",
          passReqToCallback: true,
          session: false,
        },
        async (req: any, _email: string, _password: string, done) => {
          try {
            const account = await prismaClient.account.findFirst({
              where: {
                email: req.body.email.toLowerCase(),
              },
            });

            if (!account)
              return done(null, false, {
                message: "invalid-credentials",
              });

            // Verify password and TFA code
            if (!bcrypt.compareSync(req.body.password, account.password))
              return done(null, false, {
                message: "invalid-credentials",
              });

            // Check the account status
            if (account.status == "locked")
              return done(null, false, {
                message: "account-locked",
              });

            // Log the account creation
            LoggingService.log({
              message: `Account login for ${req.body.email}`,
              level: "info",
              source: "application",
            });

            return done(null, account);
          } catch (err: unknown) {
            return done(err);
          }
        },
      ),
    };
    this.loadStrategies();
  }

  public getInstance() {
    if (!this.instance) this.instance = new SessionManager();
    return this.instance;
  }

  public loadToServer(server: Express) {
    server.use(this.sessionMiddleware);
    server.use(passport.initialize());
    server.use(passport.session());
  }

  private loadStrategies() {
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      const user = await prismaClient.account.findUnique({
        where: { id: id },
        include: {
          role: true,
        },
      });
      if (user == null) {
        done(null, null);
        return;
      }
      done(null, user);
    });

    passport.use(this.authStrategies.local);
  }

  public getSessionMiddleware() {
    return this.sessionMiddleware;
  }
}

export default SessionManager;
