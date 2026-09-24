import { RootState } from "@/store/app";
import { useSelector } from "react-redux";

export const useUserSession = () => useSelector((state : RootState) =>  state.userSlice.userSession);

export const useOnboardingDone = () => useSelector((state : RootState) => state.userSlice.onboardingDone);