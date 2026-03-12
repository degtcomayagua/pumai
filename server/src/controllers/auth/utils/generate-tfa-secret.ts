import { NextFunction, Request, Response } from "express";
import speakeasy from "speakeasy";

import type * as AuthAPITypes from "../../../../../shared/api/auth";

const handler = async (
	_req: Request<{}, {}, {}>,
	res: Response<AuthAPITypes.GenerateTFASecretResponseData>,
	_next: NextFunction,
) => {
	try {
		// Generate a secret
		const secret = speakeasy.generateSecret({ length: 20 });

		res.status(200).send({
			status: "success",
			secret: secret.base32,
			otpauth: secret.otpauth_url,
		});
	} catch (error: unknown) {
		res.status(500).send({
			status: "internal-error",
		});
	}
};

export default handler;
