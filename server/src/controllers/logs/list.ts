// import { request, response, nextfunction } from "express";
// import mongoose from "mongoose";
// import * as logsapitypes from "../../../../shared/api/logs.js";

// import logsmodel from "../../models/log.js";
// import accountmodel from "../../models/account.js";
// import accountrolemodel from "../../models/accountrole.js";
// import configmodel from "../../models/config.js";
// import ragdocumentmodel from "../../models/ragdocument.js";

// import loggingservice from "../../services/logging.js";

// export const allowed_fields_per_model = {
//   account: ["data.role", "data.status", "email.value", "profile.name"],
//   accountrole: ["name", "permissions"],
//   ragdocument: ["title", "summary", "category", "authoritylevel"],
//   ragdocument: ["title", "summary", "category", "authoritylevel"],
//   config: ["key", "value"],
// } as const;

// const model_by_name = {
//   account: accountmodel,
//   accountrole: accountrolemodel,
//   config: configmodel,
//   ragdocument: ragdocumentmodel,
//   ragdocument: ragdocumentmodel,
// } as const;

// const toobjectrecord = (
//   value: record<string, any> | map<string, any> | undefined,
// ): record<string, any> => {
//   if (!value) {
//     return {};
//   }

//   if (value instanceof map) {
//     return object.fromentries(value.entries());
//   }

//   return value;
// };

// const normalizereferenceid = (value: unknown): string | undefined => {
//   if (value === null || value === undefined) {
//     return undefined;
//   }

//   if (typeof value === "string") {
//     const trimmed = value.trim();
//     return trimmed.length > 0 ? trimmed : undefined;
//   }

//   if (typeof value === "object") {
//     if (
//       "_id" in (value as record<string, unknown>) &&
//       typeof (value as record<string, unknown>)._id === "string"
//     ) {
//       return (value as record<string, string>)._id;
//     }

//     if ("tostring" in value && typeof value.tostring === "function") {
//       const asstring = value.tostring();
//       return asstring && asstring !== "[object object]" ? asstring : undefined;
//     }
//   }

//   return undefined;
// };

// const shouldpopulatereference = (
//   populateset: set<string>,
//   detailkey: string,
//   modelname: string,
// ): boolean => {
//   if (populateset.size === 0) {
//     return false;
//   }

//   return (
//     populateset.has(detailkey) ||
//     populateset.has(`details.${detailkey}`) ||
//     populateset.has(modelname)
//   );
// };

// const toselectablefields = (modelname: string): string | undefined => {
//   const allowedfields =
//     allowed_fields_per_model[
//     modelname as keyof typeof allowed_fields_per_model
//     ];

//   if (!allowedfields?.length) {
//     return undefined;
//   }

//   return allowedfields.join(" ");
// };

// const handler = async (
//   req: request<{}, {}, logsapitypes.listrequestbody>,
//   res: response<logsapitypes.listresponsedata>,
//   _next: nextfunction,
// ) => {
//   const { page, count, filters, fields, populate, search, includedeleted } =
//     req.body;
//   const adminaccount = req.user!;

//   try {
//     // let queryfilters: record<string, any> = {};

//     // if (search && search.query.length > 0 && search.searchin.length > 0) {
//     //   const searchregex = new regexp(search.query, "i");
//     //   queryfilters = {
//     //     ...queryfilters,
//     //     $or: search.searchin.map((field) => ({
//     //       [field]: searchregex,
//     //     })),
//     //   };
//     // }

//     // if (filters) {
//     //   if (filters.startdate || filters.enddate) {
//     //     queryfilters.date = {};
//     //     if (filters.startdate) {
//     //       queryfilters.date.$gte = filters.startdate;
//     //     }
//     //     if (filters.enddate) {
//     //       queryfilters.date.$lte = filters.enddate;
//     //     }
//     //   }

//     //   if (filters.level) {
//     //     queryfilters.level = filters.level;
//     //   }

//     //   if (filters.source) {
//     //     queryfilters.source = { $regex: filters.source, $options: "i" };
//     //   }

//     //   if (filters.traceid) {
//     //     queryfilters.traceid = filters.traceid;
//     //   }
//     // }

//     // if (!includedeleted) {
//     //   queryfilters["metadata.deleted"] = { $ne: true };
//     // }

//     // let cursor = logsmodel.find(queryfilters)
//     //   .skip(page * count)
//     //   .limit(count)
//     //   .sort({ "metadata.createdat": -1 });

//     // if (fields?.length) {
//     //   cursor = cursor.select(fields.join(" "));
//     // }

//     // const [rawlogs, totallogs] = await promise.all([
//     //   cursor.lean().exec(),
//     //   logsmodel.countdocuments(queryfilters),
//     // ]);

//     // const populateset = new set((populate ?? []).map((field) => field.trim()));
//     // const logs = rawlogs as array<record<string, any>>;

//     // if (populateset.size > 0) {
//     //   const idsbymodelname = new map<string, set<string>>();

//     //   for (const log of logs) {
//     //     const details = toobjectrecord(log.details);
//     //     const references = toobjectrecord(log._references);

//     //     for (const [detailkey, modelnameraw] of object.entries(references)) {
//     //       if (typeof modelnameraw !== "string" || modelnameraw.length === 0) {
//     //         continue;
//     //       }

//     //       if (!shouldpopulatereference(populateset, detailkey, modelnameraw)) {
//     //         continue;
//     //       }

//     //       const referenceid = normalizereferenceid(details[detailkey]);
//     //       if (!referenceid || !mongoose.types.objectid.isvalid(referenceid)) {
//     //         continue;
//     //       }

//     //       if (!idsbymodelname.has(modelnameraw)) {
//     //         idsbymodelname.set(modelnameraw, new set<string>());
//     //       }

//     //       idsbymodelname.get(modelnameraw)?.add(referenceid);
//     //     }
//     //   }

//     //   const documentsbymodelname = new map<string, map<string, any>>();

//     //   await promise.all(
//     //     array.from(idsbymodelname.entries()).map(async ([modelname, ids]) => {
//     //       const model =
//     //         model_by_name[modelname as keyof typeof model_by_name] ??
//     //         mongoose.models[modelname];

//     //       if (!model || ids.size === 0) {
//     //         return;
//     //       }

//     //       const typedmodel = model as mongoose.model<any>;
//     //       const modelcursor = typedmodel.find({ _id: { $in: array.from(ids) } });
//     //       const selectablefields = toselectablefields(modelname);
//     //       if (selectablefields) {
//     //         modelcursor.select(selectablefields);
//     //       }

//     //       const documents = await modelcursor.lean().exec();
//     //       const mapbyid = new map<string, any>();

//     //       for (const document of documents as array<record<string, any>>) {
//     //         if (document?._id) {
//     //           mapbyid.set(string(document._id), document);
//     //         }
//     //       }

//     //       documentsbymodelname.set(modelname, mapbyid);
//     //     }),
//     //   );

//     //   for (const log of logs) {
//     //     const details = toobjectrecord(log.details);
//     //     const references = toobjectrecord(log._references);

//     //     for (const [detailkey, modelnameraw] of object.entries(references)) {
//     //       if (typeof modelnameraw !== "string" || modelnameraw.length === 0) {
//     //         continue;
//     //       }

//     //       if (!shouldpopulatereference(populateset, detailkey, modelnameraw)) {
//     //         continue;
//     //       }

//     //       const value = details[detailkey];
//     //       const referenceid = normalizereferenceid(value);
//     //       const document = referenceid
//     //         ? documentsbymodelname.get(modelnameraw)?.get(referenceid) ?? null
//     //         : null;

//     //       details[detailkey] = {
//     //         value,
//     //         document,
//     //       };
//     //     }

//     //     log.details = details;
//     //   }
//     // }

//     res.status(200).json({
//       status: "success",
//       logs: [],
//       totallogs: 0,
//     });
//   } catch (error: unknown) {
//     if (error instanceof error) {
//       loggingservice.log({
//         source: "api:logs:list",
//         level: "error",
//         traceid: req.traceid,
//         message: "unexpected error during log listing",
//         details: { error: error.message, stack: error.stack },

//       });
//     }

//     res.status(500).json({ status: "internal-error" });
//     return;
//   }
// };

// export default handler;
