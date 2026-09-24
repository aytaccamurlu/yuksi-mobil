import { RootState } from "@/store/app";
import { useSelector } from "react-redux";

export const useChat = () => useSelector((state: RootState) => state.chat);
