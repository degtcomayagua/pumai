import { useCallback } from "react";
import { Form } from "antd";
import { TFunction } from "i18next";

import { RolesAPITypes } from "../";
import AccountRolesFeature from "../";

export function useUpdateAccountRoleFormValidation(t: TFunction) {
	const [form] = Form.useForm<RolesAPITypes.UpdateRequestBody>();

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const defaultValues: RolesAPITypes.UpdateRequestBody = {
		level: 1,
		roleId: "",
		description: "",
		name: "",
		permissions: [],
		requiresTwoFactor: false,
	};

	const setDefaultValues = useCallback(
		(values: RolesAPITypes.UpdateRequestBody) => {
			form.setFieldsValue(values);
		},
		[form],
	);

	const validate = useCallback(
		(values: RolesAPITypes.UpdateRequestBody) => {
			const result =
				AccountRolesFeature.schemas.updateSchema.safeParse(values);

			if (result.success) {
				// No errors at all, clear all errors
				form.setFields(
					Object.keys(defaultValues).map((field) => ({
						name: field as keyof RolesAPITypes.UpdateRequestBody,
						errors: [],
					})),
				);
				return true;
			} else {
				const erroredFields = new Set(
					result.error.issues.map(
						(issue) => issue.path[0] as keyof RolesAPITypes.UpdateRequestBody,
					),
				);

				// Prepare errors array for fields that have errors
				const errors = result.error.issues.map((issue) => ({
					name: issue.path as [keyof RolesAPITypes.UpdateRequestBody],
					errors: [
						t(`dashboard:roles.modals.update.messages.${issue.message}`),
					],
				}));

				// For fields without errors, clear them explicitly
				const clearedErrors = Object.keys(defaultValues)
					.filter(
						(field) =>
							!erroredFields.has(
								field as keyof RolesAPITypes.UpdateRequestBody,
							),
					)
					.map((field) => ({
						name: field as keyof RolesAPITypes.UpdateRequestBody,
						errors: [],
					}));

				form.setFields([...errors, ...clearedErrors]);

				return false;
			}
		},
		[form, t, defaultValues],
	);

	const onValuesChange = useCallback(
		(_: any, allValues: RolesAPITypes.UpdateRequestBody) => {
			validate(allValues);
		},
		[validate],
	);

	return {
		form,
		validate,
		onValuesChange,
		setDefaultValues,
		defaultValues,
	};
}
