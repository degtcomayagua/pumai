// The purpose of this file is to manage user sessions and authentication.
// This is a module-file that can be disabled if needed.

import { Express } from "express";
import passport from "passport";
import passportLocal from "passport-local";
import session from "express-session";

import LoggingService from "./logging";

import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import MongoStore from "connect-mongo";

import AccountsModel from "../models/Account";

import type { IAccount } from "../../../shared/models/account";
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
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI as string,
      collectionName: process.env.SESSION_COLLECTION_NAME as string,
      dbName: process.env.DATABASE_NAME as string,
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
            const account: IAccount | null = await AccountsModel.findOne({
              "email.value": req.body.email.toLowerCase(),
              deleted: false,
            });
            if (!account)
              return done(null, false, {
                message: "invalid-credentials",
              });

            // Verify password and TFA code
            if (
              !bcrypt.compareSync(
                req.body.password,
                account.preferences.security.password,
              )
            )
              return done(null, false, {
                message: "invalid-credentials",
              });

            // Check the account status
            if (account.data.status == "locked")
              return done(null, false, {
                message: "account-locked",
              });

            if (
              account.preferences.security.tfaSecret !== null &&
              account.preferences.security.tfaSecret !== "" &&
              account.preferences.security.tfaSecret !== undefined
            ) {
              if (!req.body.tfaCode)
                return done(null, false, {
                  message: "requires-tfa",
                });

              const verified = speakeasy.totp.verify({
                secret: account.preferences.security.tfaSecret as string,
                encoding: "base32",
                token: req.body.tfaCode,
              });

              if (verified == false)
                return done(null, false, {
                  message: "invalid-tfa-code",
                });
            }

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
      done(null, user._id);
    });

    passport.deserializeUser(async (id: string, done) => {
      const user = await AccountsModel.findOne({
        _id: id,
        "metadata.deleted": { $ne: true },
        // "metadata.status": { $ne: false },
      }).populate("data.role");
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
