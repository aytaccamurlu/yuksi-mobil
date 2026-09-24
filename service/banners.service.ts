import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

const isPreShaped = (o: any) => o && typeof o === "object" && "imageUrl" in o;

const fromApiBanner = (b: any) => (isPreShaped(b) ? b : { id: String(b.id), imageUrl: b.image_url, link: b.link });

const BannersService = createApi({
    reducerPath: "BannersService",
    keepUnusedDataFor: 300,
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    endpoints: (builder) => ({
        getBanners: builder.query<any, void>({
            query: () => ({ url: "/api/User/banners", method: "GET" }),
            transformResponse: (r: any) => {
                const list = r?.data ?? (Array.isArray(r) ? r : []);
                return { data: list.map(fromApiBanner) };
            },
        }),
    }),
});

export const { useGetBannersQuery } = BannersService;
export default BannersService;
