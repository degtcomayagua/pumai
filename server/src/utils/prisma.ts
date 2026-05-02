/**
 * Transforms an array of field strings (with optional dot notation) into a Prisma select object
 * 
 * @template T - The Prisma model type (e.g., Prisma.AccountRoleSelect)
 * @param fields - Array of field names, can include dot notation for nested fields (e.g., "metadata.createdAt")
 * @param defaultSelect - Default fields to select if no fields provided. Defaults to { id: true }
 * @returns Partial<T> - A Prisma select object
 * 
 * @example
 * const select = getFieldsToSelect<Prisma.AccountRoleSelect>(
 *   ["id", "name", "metadata.createdAt"],
 *   { id: true, name: true }
 * );
 * // Returns: { id: true, name: true, metadata: { select: { createdAt: true } } }
 */
export const getFieldsToSelect = <T,>(
  fields: string[] | undefined,
  defaultSelect?: Partial<T>,
): Partial<T> => {
  if (!fields || fields.length === 0) {
    return (defaultSelect || { id: true }) as Partial<T>;
  }

  const select: any = {};

  for (const field of fields) {
    const parts = field.split(".");

    if (parts.length === 1) {
      // Simple field: "id", "name"
      select[field] = true;
    } else {
      // Nested field: "metadata.createdBy"
      let current = select;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = { select: {} };
        }
        current = current[part].select;
      }
      current[parts[parts.length - 1]] = true;
    }
  }

  return select as Partial<T>;
};

/**
 * Transforms an array of field strings into a Prisma include object with selective field loading
 * Allows you to specify which fields to include from related models
 * 
 * @template T - The Prisma model type (e.g., Prisma.AccountRoleInclude)
 * @template K - The populate field array type (inferred from populate parameter)
 * @param populate - Array of field names with dot notation for relations (e.g., ["metadata.createdBy"])
 * @param relationFieldMap - Record mapping each populate field to arrays of field names to include
 *                          Keys must match values from populate array
 *                          Example: { "metadata.createdBy": ["id", "name"], "metadata.updatedBy": ["id", "email"] }
 * @returns Partial<T> - A Prisma include object
 * 
 * @example
 * const include = getFieldsToPopulate<Prisma.AccountRoleInclude, typeof populate>(
 *   ["metadata.createdBy", "metadata.updatedBy"],
 *   {
 *     "metadata.createdBy": ["id", "name"],
 *     "metadata.updatedBy": ["id", "email"]
 *   }
 * );
 */
export const getFieldsToPopulate = <T, K extends readonly string[]>(
  populate: K,
  relationFieldMap: Record<K[number], string[]>,
): Partial<T> => {
  const select: any = {}; // Renamed for clarity

  for (const field of populate) {
    const parts = field.split(".");

    if (parts.length === 1) {
      select[field] = true;
    } else if (parts.length === 2) {
      const [parent, relation] = parts;

      if (!select[parent]) {
        select[parent] = { select: {} };
      }

      if (relationFieldMap[field as K[number]]) {
        select[parent].select[relation] = {
          select: Object.fromEntries(
            relationFieldMap[field as K[number]].map((f) => [f, true])
          ),
        };
      } else {
        select[parent].select[relation] = true;
      }
    }
  }

  return select as Partial<T>;
};

