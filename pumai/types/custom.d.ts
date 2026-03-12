export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepNullablePartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepNullablePartial<T[P]> | null
    : T[P] | null;
};
