export const degrees = (value: number): number => {
  if (!Number.isFinite(value)) {
    throw new RangeError("degrees value must be finite");
  }
  return (value * Math.PI) / 180;
};
