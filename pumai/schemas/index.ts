import { z } from "zod";

export const zObjectId = z.string().length(24, "invalid-object-id");

export const zObjectIdWithMessage = (message: string) =>
  z.string().refine((val) => val.length == 24, {
    message,
  });

export const isoDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "invalid-date-string",
  });

export const turnIntoUndefinedIfEmpty = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (data) => {
      if (data == undefined) return undefined;
      if (typeof data === "string" && data.trim() === "") return undefined;
      if (Array.isArray(data) && data.length === 0) return undefined;
      return data;
    },
    schema.optional(), // Ensure undefined is accepted
  );

export const turnIntoNullIfEmpty = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (data) => {
      if (data == undefined) return null;
      if (typeof data === "string" && data.trim() === "") return null;
      if (Array.isArray(data) && data.length === 0) return null;
      return data;
    },
    schema.nullable(), // Ensure null is accepted
  );
