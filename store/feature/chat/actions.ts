import { store } from "@/store/app";
import { Message, _addMessage, _hideSuggestions, _resetChat, _setError, _setInputText, _setLoading, _setSessionId } from "./slice";

export const setInputText = (text: string) => store.dispatch(_setInputText(text));
export const addMessage = (message: Message) => store.dispatch(_addMessage(message));
export const setLoading = (isLoading: boolean) => store.dispatch(_setLoading(isLoading));
export const setError = (error: string | null) => store.dispatch(_setError(error));
export const setSessionId = (sessionId: string) => store.dispatch(_setSessionId(sessionId));
export const hideSuggestions = () => store.dispatch(_hideSuggestions());
export const resetChat = () => store.dispatch(_resetChat());
