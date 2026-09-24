import { RootState } from "@/store/app";
import { useSelector } from "react-redux";

export const useCreateLoadState = () => useSelector((state: RootState) => state.createLoad);
