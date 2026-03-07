export type UserCreatedPayload = { userId: string; email: string; name: string; createdAt: Date };
export type UserUpdatedPayload = { userId: string; changes: Record<string, unknown>; updatedAt: Date };
export type UserDeletedPayload = { userId: string; deletedAt: Date };

export const emitUserCreated = async (userId: string, email: string, name: string): Promise<void> => {
  void { userId, email, name, createdAt: new Date() }
};

export const emitUserUpdated = async (userId: string, changes: Record<string, unknown>): Promise<void> => {
  void { userId, changes, updatedAt: new Date() }
};

export const emitUserDeleted = async (userId: string): Promise<void> => {
  void { userId, deletedAt: new Date() } 
};