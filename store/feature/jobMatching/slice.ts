import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type MatchingPhase = "searching" | "success" | "review" | "not_found";

export const SEARCH_RADIUS_STAGES: (number | "il" | "start")[] = ["start", 5, 10, 15, 20, "il"];
export const SEARCH_STAGE_MS = 2200;

export const radiusStageLabel = (stage: number | "il" | "start"): string => {
    if (stage === "start") return "Aranmaya başlıyor, lütfen bekleyin";
    if (stage === "il") return "İl çapında aranıyor";
    return `${stage} km alanda aranıyor`;
};

// Job'un backend'den geri okunması güvenilir değil (GET /api/User/jobs/{id}
// yalnızca id/status/total_price dönüyor, bkz. issuesProblemsAgain.md) — bu
// yüzden onay kartında gösterilecek özet, formdan doğrudan burada saklanır.
export interface MatchingSummary {
    from: string;
    to: string;
    totalAmount: string;
}

export interface MatchedDriver {
    id: string;
    fullName: string;
    phone: string;
}

export interface ActiveMatching {
    jobId: string;
    startedAt: number;
    phase: MatchingPhase;
    radiusStageIndex: number;
    summary?: MatchingSummary;
    driver?: MatchedDriver;
}

interface JobMatchingState {
    active: ActiveMatching | null;
}

const initialState: JobMatchingState = {
    active: null,
};

const jobMatchingSlice = createSlice({
    name: "jobMatching",
    initialState,
    reducers: {
        _startMatching: (
            state,
            action: PayloadAction<{ jobId: string; startedAt: number; summary?: MatchingSummary }>,
        ) => {
            state.active = { ...action.payload, phase: "searching", radiusStageIndex: 0 };
        },
        _setMatchingPhase: (state, action: PayloadAction<MatchingPhase>) => {
            if (state.active) state.active.phase = action.payload;
        },
        _setRadiusStage: (state, action: PayloadAction<number>) => {
            if (state.active) state.active.radiusStageIndex = action.payload;
        },
        _setMatchedDriver: (state, action: PayloadAction<MatchedDriver>) => {
            if (state.active) state.active.driver = action.payload;
        },
        _clearMatching: (state) => {
            state.active = null;
        },
    },
});

export const { _startMatching, _setMatchingPhase, _setRadiusStage, _setMatchedDriver, _clearMatching } =
    jobMatchingSlice.actions;
export default jobMatchingSlice.reducer;
