/** Filled in by PlanProvider. Lets the chat logic read the plan without a circular dependency. */
export const planLink: { getContext: () => string; refresh: () => Promise<void> } = {
    getContext: () => '',
    refresh: async () => {},
  };