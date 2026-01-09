import { ProductivityContext } from '../domain/productivityContext';
import { assertValidProductivityContext } from '../domain/productivity';

export const DEFAULT_PRODUCTIVITY_CONTEXT: ProductivityContext = {
  hoursPerFtePerDay: 8,
};

export function getProductivityContext(): ProductivityContext {
  assertValidProductivityContext(DEFAULT_PRODUCTIVITY_CONTEXT);
  return DEFAULT_PRODUCTIVITY_CONTEXT;
}
