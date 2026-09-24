import { createApi } from "@reduxjs/toolkit/query/react";
import { UPLOAD_TIMEOUT_MS, yuksiBaseQuery } from "./api";
import { fromApiLocation, toApiLocation } from "@/utils/savedRoutes";
import { fromApiJob } from "@/utils/shipments";
import { LocationData } from "@/store/feature/createLoad/slice";
import { MOCK_VEHICLES } from "@/service/mockData";
import { CATEGORY_BY_PRODUCT_ID, VEHICLE_CATEGORY_ORDER } from "@/utils/vehicleCatalog";

const CreateLoadService = createApi({
    reducerPath: 'CreateLoadService',
    keepUnusedDataFor: 300,
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    tagTypes: ['Addresses', 'Jobs'],
    endpoints: (builder) => ({
        getVehicles: builder.query<any, void>({
            query: () => '/api/Vehicle',
            transformResponse: (r: any) => {
                if (Array.isArray(r?.data)) return { data: r.data };

                const real: any[] = Array.isArray(r?.vehicles) ? r.vehicles : [];
                const byCategory = new Map<string, any>();
                real.forEach((v) => {
                    const category = CATEGORY_BY_PRODUCT_ID[v.product_id];
                    if (category) byCategory.set(category, v);
                });

                const merged = VEHICLE_CATEGORY_ORDER.map((category, i) => {
                    const fallback = MOCK_VEHICLES[i];
                    const match = byCategory.get(category);
                    if (!match) return fallback;
                    return {
                        id: match.product_id,
                        productId: match.product_id,
                        template: category,
                        type: fallback?.type ?? category,
                        name: match.name || fallback?.name,
                        capacityInfo: match.capacity || fallback?.capacityInfo,
                    };
                });

                return { data: merged };
            },
        }),
        priceEstimate: builder.mutation<any, any>({
            query: (body) => ({
                url: '/api/User/jobs/price-estimate',
                method: 'POST',
                body,
            }),
            extraOptions: { retryable: true },
        }),
        createJob: builder.mutation<any, any>({
            query: (body) => ({
                url: '/api/User/jobs',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Jobs'],
        }),
        // "Yük Tarat" AI araç tespiti — mock'ta kalıyor (bkz. hooks/useCargoScan.ts).
        uploadCargoImage: builder.mutation<any, FormData>({
            query: (formData) => ({
                url: '/api/User/jobs/cargo-scan',
                method: 'POST',
                body: formData,
                headers: {
                    'X-Is-Upload': 'true',
                },
                timeout: UPLOAD_TIMEOUT_MS,
            }),
        }),
        uploadMedia: builder.mutation<any, FormData>({
            query: (formData) => ({
                url: '/api/media/upload',
                method: 'POST',
                body: formData,
                headers: {
                    'X-Is-Upload': 'true',
                },
                timeout: UPLOAD_TIMEOUT_MS,
            }),
        }),
        getJobs: builder.query<any, void>({
            query: () => '/api/User/jobs',
            transformResponse: (response: any) => {
                const list = response?.jobs ?? response?.data ?? (Array.isArray(response) ? response : []);
                return list.map(fromApiJob);
            },
            providesTags: ['Jobs'],
        }),
        getJobById: builder.query<any, string>({
            query: (id) => `/api/User/jobs/${id}`,
            transformResponse: (response: any) => fromApiJob(response?.data ?? response),
        }),
        getDrivers: builder.query<any, void>({
            query: () => '/api/drivers',
            transformResponse: (response: any) => {
                const list = response?.drivers ?? response?.data ?? (Array.isArray(response) ? response : []);
                return list.map((d: any) => ({
                    id: d.id,
                    fullName: d.full_name || d.fullName || 'Taşıyıcı',
                    phone: d.phone || '',
                    email: d.email || '',
                }));
            },
        }),
        assignCarrierToJob: builder.mutation<any, { id: string; carrierId: string }>({
            query: ({ id, carrierId }) => ({
                url: `/api/User/jobs/${id}/assign-carrier`,
                method: 'POST',
                body: { carrier_id: carrierId },
            }),
            invalidatesTags: ['Jobs'],
        }),
        getAddresses: builder.query<any, void>({
            query: () => '/api/user/saved-routes',
            transformResponse: (response: any) => {
                const list = Array.isArray(response) ? response : (response?.data ?? []);
                return list.map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    from: fromApiLocation(r.from),
                    to: fromApiLocation(r.to),
                }));
            },
            providesTags: ['Addresses'],
        }),
        saveAddress: builder.mutation<any, { title: string; from: LocationData; to: LocationData }>({
            query: (body) => ({
                url: '/api/user/saved-routes',
                method: 'POST',
                body: {
                    title: body.title,
                    from: toApiLocation(body.from),
                    to: toApiLocation(body.to),
                },
            }),
            invalidatesTags: ['Addresses'],
        }),
        deleteAddress: builder.mutation<any, string>({
            query: (id) => ({
                url: `/api/user/saved-routes/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Addresses'],
        }),

        restoreAddresses: builder.mutation<any, void>({
            query: () => ({
                url: '/api/user/addresses/restore',
                method: 'POST',
            }),
            invalidatesTags: ['Addresses'],
        }),

        clearShipmentHistory: builder.mutation<any, void>({
            query: () => ({
                url: '/api/User/jobs/clear',
                method: 'POST',
            }),
            invalidatesTags: ['Jobs'],
        }),

        restoreShipmentHistory: builder.mutation<any, void>({
            query: () => ({
                url: '/api/User/jobs/restore',
                method: 'POST',
            }),
            invalidatesTags: ['Jobs'],
        }),
    }),
});

export const {
    useGetVehiclesQuery,
    usePriceEstimateMutation,
    useCreateJobMutation,
    useGetJobsQuery,
    useGetJobByIdQuery,
    useGetDriversQuery,
    useAssignCarrierToJobMutation,
    useGetAddressesQuery,
    useSaveAddressMutation,
    useDeleteAddressMutation,
    useRestoreAddressesMutation,
    useClearShipmentHistoryMutation,
    useRestoreShipmentHistoryMutation,
    useUploadCargoImageMutation,
    useUploadMediaMutation,
} = CreateLoadService;

export default CreateLoadService;
