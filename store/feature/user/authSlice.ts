import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { UserSessionType } from "../../../types/UserSessionType";

type initialStateType = {
    userSession: UserSessionType | null | undefined
    onboardingDone: boolean
}
const initialState : initialStateType = {
    userSession : null,
    onboardingDone : false,
}

const UserSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        _setUserSession: (state, action : PayloadAction<UserSessionType | null | undefined>) => {
            state.userSession = action.payload;
        },
        _clearUserSession: (state) => {
            state.userSession = null;
        },
        _setOnboardingDone: (state, action : PayloadAction<boolean>) => {
            state.onboardingDone = action.payload;
        },
    },
})


export const { _setUserSession, _clearUserSession, _setOnboardingDone } = UserSlice.actions;
export default UserSlice.reducer;
