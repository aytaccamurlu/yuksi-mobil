import { RootState } from "@/store/app";
import { useSelector } from "react-redux";

export const useTicarimDraft = () => useSelector((state: RootState) => state.ticarim);
