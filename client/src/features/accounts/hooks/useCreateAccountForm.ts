import { useCallback } from "react";
import { Form } from "antd";
import type { TFunction } from "i18next";

import { AccountAPITypes } from "../";
import AccountsFeature from "../";

export function useCreateAccountFormValidation(t: TFunction) {
  const [form] = Form.useForm<AccountAPITypes.CreateRequestBody>();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultValues: AccountAPITypes.CreateRequestBody = {
    name: "",
    email: "",
    password: "",
    roleId: "",
    campus: "COMAYAGUA",
  };

  const validate = useCallback(
    (values: AccountAPITypes.CreateRequestBody) => {
      const result = AccountsFeature.schemas.createSchema.safeParse(values);

      if (result.success) {
        // No errors at all, clear all errors
        form.setFields(
          Object.keys(defaultValues).map((field) => ({
            name: field as keyof AccountAPITypes.CreateRequestBody,
            errors: [],
          })),
        );
        return true;
      } else {
        const erroredFields = new Set(
          result.error.issues.map(
            (issue) => issue.path[0] as keyof AccountAPITypes.CreateRequestBody,
          ),
        );

        // Prepare errors array for fields that have errors
        const errors = result.error.issues.map((issue) => ({
          name: issue.path as [keyof AccountAPITypes.CreateRequestBody],
          errors: [
            t(`dashboard:accounts.modals.create.messages.${issue.message}`),
          ],
        }));

        // For fields without errors, clear them explicitly
        const clearedErrors = Object.keys(defaultValues)
          .filter(
            (field) =>
              !erroredFields.has(
                field as keyof AccountAPITypes.CreateRequestBody,
              ),
          )
          .map((field) => ({
            name: field as keyof AccountAPITypes.CreateRequestBody,
            errors: [],
          }));

        form.setFields([...errors, ...clearedErrors]);

        return false;
      }
    },
    [form, t, defaultValues],
  );

  const onValuesChange = useCallback(
    (_: any, allValues: AccountAPITypes.CreateRequestBody) => {
      validate(allValues);
    },
    [validate],
  );

  return {
    form,
    validate,
    onValuesChange,
    defaultValues,
  };
}
