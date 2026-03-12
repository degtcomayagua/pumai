import AccountUtils from "../../../utils/accounts";
import { NextFunction, Request, Response } from "express";

import type * as AuthAPITypes from "../../../../../shared/api/auth";
import { IAccount } from "../../../../../shared/models/account";

const disableTFAHandler = async (
	req: Request<{}, {}, AuthAPITypes.DisableTFARequestBody>,
	res: Response<AuthAPITypes.DisableTFAResponseData>,
	_next: NextFunction,
) => {
	const account = req.user as IAccount;
	const { tfaCode } = req.body;

	try {
		// Check TFA code validity
		const isValidTFA = AccountUtils.verifyTFA(
			account.preferences.security.tfaSecret!,
			tfaCode,
		);

		if (!isValidTFA) {
			res.status(403).send({
				status: "invalid-tfa-code",
			});
			return;
		}

		res.status(200).send({
			status: "success",
		});
	} catch (error: unknown) {
		res.status(500).send({
			status: "internal-error",
		});
	}
};

export default disableTFAHandler;
