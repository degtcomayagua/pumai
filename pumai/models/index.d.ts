export type ResponseStatus =
  | "internal-error"
  | "success"
  | "unauthenticated"
  | "forbidden"
  | "network-error"
  | "invalid-parameters";

export type CampusCode =
  | "COMAYAGUA"
  | "TEGUCIGALPA"
  | "SANPEDRO"
  | "CHOLUTECA"
  | "LA CEIBA"
  | "DANLI"
  | "SANTA ROSA"
  | "GLOBAL";

export type DeliveryMode = "onsite" | "online" | "hybrid";

export type DocumentCategory =
  | "regulation"
  | "administrative"
  | "campus_service"
  | "student_life"
  | "support";

export type SourceType = "official" | "approved_student";
