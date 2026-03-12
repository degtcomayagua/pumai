import { Request, Response, NextFunction } from "express";
import { ISessionAccount } from "../../../shared/types/sessions";
import { Permission } from "../../../shared/types/permissions";

const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.isUnauthenticated() || !req.user) {
    res.status(401).send({ status: "unauthenticated" });
  } else {
    next();
  }
};

const ensurePermissions =
  (permission: Permission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      const userPermissions = (req.user as ISessionAccount).data.role
        .permissions as Permission[];
      if (userPermissions.includes("*")) {
        next();
      } else {
        // Check if the user has all the required permissions
        const hasAllPermissions = permission.every((perm) =>
          userPermissions.includes(perm),
        );

        if (hasAllPermissions) {
          next();
        } else {
          res.status(403).send({ status: "unauthorized" });
        }
      }
    } else {
      res.status(403).send({ status: "unauthorized" });
    }
  };

export { ensureAuthenticated, ensurePermissions };
