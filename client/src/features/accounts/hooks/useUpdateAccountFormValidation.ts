import { useCallback } from "react";
import { Form } from "antd";
import { TFunction } from "i18next";

import { AccountAPITypes } from "../";
import AccountsFeature from "../";

export function useUpdateAccountFormValidation(t: TFunction) {
	const [form] = Form.useForm<AccountAPITypes.UpdateRequestBody>();

	const defaultValues: AccountAPITypes.UpdateRequestBody = {
		accountId: "",
		disableTwoFactor: false,
		email: "",
		name: "",
		campus: "COMAYAGUA",
		password: "",
		roleId: "",
	};

	const setDefaultValues = useCallback(
		(values: AccountAPITypes.UpdateRequestBody) => {
			form.setFieldsValue(values);
		},
		[form],
	);

	const validate = useCallback(
		(values: AccountAPITypes.UpdateRequestBody) => {
			const result =
				AccountsFeature.schemas.updateSchema.safeParse(values);

			if (result.success) {
				// No errors at all, clear all errors
				form.setFields(
					Object.keys(defaultValues).map((field) => ({
						name: field as keyof AccountAPITypes.UpdateRequestBody,
						errors: [],
					})),
				);
				return true;
			} else {
				const erroredFields = new Set(
					result.error.issues.map(
						(issue) => issue.path[0] as keyof AccountAPITypes.UpdateRequestBody,
					),
				);

				// Prepare errors array for fields that have errors
				const errors = result.error.issues.map((issue) => ({
					name: issue.path as [keyof AccountAPITypes.UpdateRequestBody],
					errors: [
						t(
							`dashboard:accounts.modals.update.messages.${issue.code == "invalid_union" ? issue.errors[0][0].message : issue.message}`,
						),
					],
				}));

				// For fields without errors, clear them explicitly
				const clearedErrors = Object.keys(defaultValues)
					.filter(
						(field) =>
							!erroredFields.has(
								field as keyof AccountAPITypes.UpdateRequestBody,
							),
					)
					.map((field) => ({
						name: field as keyof AccountAPITypes.UpdateRequestBody,
						errors: [],
					}));

				form.setFields([...errors, ...clearedErrors]);

				return false;
			}
		},
		[form, t, defaultValues],
	);

	const onValuesChange = useCallback(
		(_: any, allValues: AccountAPITypes.UpdateRequestBody) => {
			validate(allValues);
		},
		[validate],
	);

	return {
		form,
		validate,
		onValuesChange,
		defaultValues,
		setDefaultValues,
	};
}
