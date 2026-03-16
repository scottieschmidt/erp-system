import * as v from "valibot";

export const IntStrSchema = v.pipe(
  v.string(),
  v.nonEmpty(),
  v.transform((str) => {
    const num = parseInt(str, 10);
    if (isNaN(num) || !Number.isInteger(num)) {
      throw new Error("Invalid integer");
    }
    return num;
  }),
);

export const NumStrSchema = v.pipe(
  v.string(),
  v.nonEmpty(),
  v.transform((str) => {
    const num = parseFloat(str);
    if (isNaN(num)) {
      throw new Error("Invalid number");
    }
    return num;
  }),
);
