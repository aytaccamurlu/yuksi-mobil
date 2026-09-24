let activeConversationId: string | null = null;

export const setActiveConversationId = (id: string | null): void => {
    activeConversationId = id;
};

export const getActiveConversationId = (): string | null => activeConversationId;
