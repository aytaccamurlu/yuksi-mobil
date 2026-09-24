import { RootState } from "@/store/app";
import { useSelector } from "react-redux";

export const useActiveMatching = () => useSelector((state: RootState) => state.jobMatching.active);
