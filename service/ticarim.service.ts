import { createApi } from "@reduxjs/toolkit/query/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { yuksiBaseQuery } from "./api";
import { fromApiListing, fromApiListingCard } from "@/utils/ticarim";

const unwrapList = (response: any, key: string): any[] =>
    response?.[key] ?? response?.data ?? (Array.isArray(response) ? response : []);

// Favoriler cihazda da saklanır, sunucuyla uyuşmazlıkta override kazanır.
const LOCAL_FAVORITE_OVERRIDES_KEY = "ticarim_favorite_overrides";

const getFavoriteOverrides = async (): Promise<Record<string, boolean>> => {
    try {
        const raw = await AsyncStorage.getItem(LOCAL_FAVORITE_OVERRIDES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const setFavoriteOverride = async (id: string, isFavorite: boolean) => {
    try {
        const overrides = await getFavoriteOverrides();
        overrides[id] = isFavorite;
        await AsyncStorage.setItem(LOCAL_FAVORITE_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch {
        // yoksay
    }
};

const applyFavoriteOverrides = (serverIds: string[], overrides: Record<string, boolean>): string[] => {
    const result = new Set(serverIds);
    for (const [id, isFavorite] of Object.entries(overrides)) {
        if (isFavorite) result.add(id);
        else result.delete(id);
    }
    return Array.from(result);
};

export const LISTINGS_PAGE_SIZE = 20;

export type ListingsSearchArgs = {
    categoryId?: string;
    q?: string;
    priceMin?: number;
    priceMax?: number;
    kmMin?: number;
    kmMax?: number;
    vehicleCondition?: number;
};

export type ListingsPage = { items: any[]; page: number; totalPages: number };

const TicarimService = createApi({
    reducerPath: "TicarimService",
    keepUnusedDataFor: 300,
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    tagTypes: ["Listings", "MyListings", "Favorites", "Catalog", "ListingDetail"],
    endpoints: (builder) => ({
        getCategories: builder.query<any[], void>({
            query: () => "/api/ticarim/categories",
            transformResponse: (r: any) => unwrapList(r, "categories"),
            providesTags: ["Catalog"],
        }),

        getBrands: builder.query<any[], { categoryId?: string } | void>({
            query: (params) => {
                const qs = params?.categoryId ? `?categoryId=${params.categoryId}` : "";
                return `/api/ticarim/brands${qs}`;
            },
            transformResponse: (r: any) => unwrapList(r, "brands"),
            providesTags: ["Catalog"],
        }),

        getModels: builder.query<any[], { brandId: string; categoryId?: string }>({
            query: ({ brandId, categoryId }) => {
                const qs = new URLSearchParams({ brandId });
                if (categoryId) qs.set("categoryId", categoryId);
                return `/api/ticarim/models?${qs.toString()}`;
            },
            transformResponse: (r: any) => unwrapList(r, "models"),
            providesTags: ["Catalog"],
        }),

        getVehicleTypes: builder.query<any[], { categoryId: string }>({
            query: ({ categoryId }) => `/api/ticarim/vehicle-types?categoryId=${categoryId}`,
            transformResponse: (r: any) => unwrapList(r, "vehicle_types"),
            providesTags: ["Catalog"],
        }),

        getListings: builder.query<any[], { categoryId?: string; q?: string; latitude?: number; longitude?: number } | void>({
            query: (params) => {
                const qs = new URLSearchParams();
                if (params?.categoryId) qs.set("categoryId", params.categoryId);
                if (params?.q) qs.set("q", params.q);
                if (params?.latitude != null && params?.longitude != null) {
                    qs.set("latitude", String(params.latitude));
                    qs.set("longitude", String(params.longitude));
                    qs.set("sort", "Nearest");
                }
                const suffix = qs.toString() ? `?${qs.toString()}` : "";
                return { url: `/api/ticarim/listings${suffix}`, method: "GET" };
            },
            transformResponse: (r: any) => unwrapList(r, "listings").map(fromApiListingCard),
            providesTags: ["Listings"],
        }),

        searchListings: builder.infiniteQuery<ListingsPage, ListingsSearchArgs, number>({
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage) =>
                    lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
                refetchCachedPages: false,
            },
            query: ({ queryArg, pageParam }) => {
                const qs = new URLSearchParams();
                if (queryArg.categoryId) qs.set("categoryId", queryArg.categoryId);
                if (queryArg.q) qs.set("q", queryArg.q);
                if (queryArg.priceMin != null) qs.set("priceMin", String(queryArg.priceMin));
                if (queryArg.priceMax != null) qs.set("priceMax", String(queryArg.priceMax));
                if (queryArg.kmMin != null) qs.set("kmMin", String(queryArg.kmMin));
                if (queryArg.kmMax != null) qs.set("kmMax", String(queryArg.kmMax));
                if (queryArg.vehicleCondition != null) qs.set("vehicleCondition", String(queryArg.vehicleCondition));
                qs.set("page", String(pageParam));
                qs.set("pageSize", String(LISTINGS_PAGE_SIZE));
                return { url: `/api/ticarim/listings?${qs.toString()}`, method: "GET" };
            },
            transformResponse: (r: any): ListingsPage => {
                const items = unwrapList(r, "listings").map(fromApiListingCard);
                const p = r?.pagination;
                return {
                    items,
                    page: p?.page ?? 1,
                    totalPages: p?.total_pages ?? 1,
                };
            },
            providesTags: ["Listings"],
        }),

        getMyListings: builder.query<any[], void>({
            query: () => ({ url: "/api/ticarim/my-listings", method: "GET" }),
            transformResponse: (r: any) => unwrapList(r, "listings").map(fromApiListingCard),
            providesTags: ["MyListings"],
        }),

        getListingById: builder.query<any, string>({
            query: (id) => `/api/ticarim/listings/${id}`,
            transformResponse: (r: any) => fromApiListing(r?.listing ?? r?.data ?? r),
            providesTags: (result, error, id) => [{ type: "ListingDetail", id }],
        }),

        createListing: builder.mutation<any, any>({
            query: (body) => ({
                url: "/api/ticarim/listings",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Listings", "MyListings"],
        }),

        publishListing: builder.mutation<any, string>({
            query: (id) => ({
                url: `/api/ticarim/listings/${id}/publish`,
                method: "POST",
            }),
            invalidatesTags: (result, error, id) => ["Listings", "MyListings", { type: "ListingDetail", id }],
        }),

        deleteListing: builder.mutation<any, string>({
            query: (id) => ({
                url: `/api/ticarim/listings/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (result, error, id) => ["Listings", "MyListings", { type: "ListingDetail", id }],
        }),

        updateListing: builder.mutation<any, { id: string; body: any }>({
            query: ({ id, body }) => ({
                url: `/api/ticarim/listings/${id}`,
                method: "PUT",
                body,
            }),
            transformResponse: (r: any) => fromApiListing(r?.listing ?? r?.data ?? r),
            invalidatesTags: (result, error, { id }) => ["Listings", "MyListings", { type: "ListingDetail", id }],
        }),

        setListingPassive: builder.mutation<any, string>({
            query: (id) => ({ url: `/api/ticarim/listings/${id}/passive`, method: "POST" }),
            invalidatesTags: (result, error, id) => ["Listings", "MyListings", { type: "ListingDetail", id }],
        }),

        reactivateListing: builder.mutation<any, string>({
            query: (id) => ({ url: `/api/ticarim/listings/${id}/reactivate`, method: "POST" }),
            invalidatesTags: (result, error, id) => ["Listings", "MyListings", { type: "ListingDetail", id }],
        }),

        markListingSold: builder.mutation<any, string>({
            query: (id) => ({ url: `/api/ticarim/listings/${id}/sold`, method: "POST" }),
            invalidatesTags: (result, error, id) => ["Listings", "MyListings", { type: "ListingDetail", id }],
        }),

        addListingImages: builder.mutation<
            any,
            { id: string; images: { media_image_id: string; sort_order: number; is_cover: boolean }[] }
        >({
            query: ({ id, images }) => ({
                url: `/api/ticarim/listings/${id}/images`,
                method: "POST",
                body: { images },
            }),
            invalidatesTags: (result, error, { id }) => ["Listings", "MyListings", { type: "ListingDetail", id }],
        }),

        reorderListingImages: builder.mutation<
            any,
            { id: string; orderedListingImageIds: string[]; coverListingImageId: string }
        >({
            query: ({ id, orderedListingImageIds, coverListingImageId }) => ({
                url: `/api/ticarim/listings/${id}/images/reorder`,
                method: "PUT",
                body: {
                    ordered_listing_image_ids: orderedListingImageIds,
                    cover_listing_image_id: coverListingImageId,
                },
            }),
            invalidatesTags: (result, error, { id }) => ["Listings", "MyListings", { type: "ListingDetail", id }],
        }),

        removeListingImage: builder.mutation<any, { id: string; imageId: string }>({
            query: ({ id, imageId }) => ({
                url: `/api/ticarim/listings/${id}/images/${imageId}`,
                method: "DELETE",
            }),
            invalidatesTags: (result, error, { id }) => ["Listings", "MyListings", { type: "ListingDetail", id }],
        }),

        getFavoriteListingIds: builder.query<{ listing_ids: string[] }, void>({
            query: () => ({ url: "/api/ticarim/favorites", method: "GET" }),
            transformResponse: async (r: any) => {
                const serverIds: string[] = (r?.listing_ids ?? r?.data ?? (Array.isArray(r) ? r : [])).map(String);
                const overrides = await getFavoriteOverrides();
                return { listing_ids: applyFavoriteOverrides(serverIds, overrides) };
            },
            providesTags: ["Favorites"],
        }),

        toggleFavoriteListing: builder.mutation<any, string>({
            query: (id) => ({
                url: `/api/ticarim/favorites/${id}/toggle`,
                method: "POST",
            }),
            invalidatesTags: ["Favorites"],
            async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
                const idStr = String(id);
                const cached = TicarimService.endpoints.getFavoriteListingIds.select(undefined)(getState() as any);
                const currentlyFavorite = cached.data?.listing_ids.includes(idStr) ?? false;
                const nextFavorite = !currentlyFavorite;

                await setFavoriteOverride(idStr, nextFavorite);

                dispatch(
                    TicarimService.util.updateQueryData("getFavoriteListingIds", undefined, (draft) => {
                        draft.listing_ids = nextFavorite
                            ? Array.from(new Set([...draft.listing_ids, idStr]))
                            : draft.listing_ids.filter((x) => x !== idStr);
                    }),
                );

                try {
                    await queryFulfilled;
                } catch {
                    // yoksay — override kalıcı
                }
            },
        }),
    }),
});

export const {
    useGetCategoriesQuery,
    useGetBrandsQuery,
    useGetModelsQuery,
    useGetVehicleTypesQuery,
    useGetListingsQuery,
    useSearchListingsInfiniteQuery,
    useGetMyListingsQuery,
    useGetListingByIdQuery,
    useCreateListingMutation,
    usePublishListingMutation,
    useDeleteListingMutation,
    useUpdateListingMutation,
    useSetListingPassiveMutation,
    useReactivateListingMutation,
    useMarkListingSoldMutation,
    useAddListingImagesMutation,
    useReorderListingImagesMutation,
    useRemoveListingImageMutation,
    useGetFavoriteListingIdsQuery,
    useToggleFavoriteListingMutation,
} = TicarimService;

export default TicarimService;
