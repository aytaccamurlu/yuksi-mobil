import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
    id: string;
    text: string;
    side: 'user' | 'bot';
    images?: string[];
    location?: { address: string; latitude: number; longitude: number };
}

export const WELCOME_MESSAGE =
    'Merhaba! 👋 Ben Yüksi kanguru. Kargonun nerede olduğu, teslimat süresi, ücretler ve gönderilerinle ilgili sorularını yanıtlayabilirim.';

const welcome = (): Message => ({ id: 'welcome', text: WELCOME_MESSAGE, side: 'bot' });

interface ChatState {
    messages: Message[];
    inputText: string;
    suggestions: string[];
    showSuggestions: boolean;
    isLoading: boolean;
    error: string | null;
    sessionId: string | null;
}

const initialState: ChatState = {
    messages: [welcome()],
    inputText: '',
    suggestions: ['Kargom nerede?', 'Teslimat ne kadar sürer?', 'Ücret nasıl hesaplanıyor?', 'Gönderi nasıl oluştururum?'],
    showSuggestions: true,
    isLoading: false,
    error: null,
    sessionId: null,
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        _setInputText: (state, action: PayloadAction<string>) => {
            state.inputText = action.payload;
        },
        _addMessage: (state, action: PayloadAction<Message>) => {
            state.messages.push(action.payload);
        },
        _setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        _setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        _setSessionId: (state, action: PayloadAction<string>) => {
            state.sessionId = action.payload;
        },
        _hideSuggestions: (state) => {
            state.showSuggestions = false;
        },
        _resetChat: (state) => {
            state.messages = [welcome()];
            state.inputText = '';
            state.showSuggestions = true;
            state.error = null;
            state.sessionId = null;
        }
    },
});

export const {
    _setInputText,
    _addMessage,
    _setLoading,
    _setError,
    _setSessionId,
    _hideSuggestions,
    _resetChat
} = chatSlice.actions;

export default chatSlice.reducer;
