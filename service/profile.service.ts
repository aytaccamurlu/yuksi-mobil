import { createApi } from "@reduxjs/toolkit/query/react";
import { UPLOAD_TIMEOUT_MS, yuksiBaseQuery } from "./api";

const ProfileService = createApi({
    reducerPath: "ProfileService",
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    tagTypes: ["Profile", "UserLocation"],
    endpoints: (builder) => ({
        getUserLocation: builder.query({
            query: () => ({
                url: "/api/User/location",
                method: "GET",
            }),
            providesTags: ["UserLocation"],
        }),

        updateUserLocation: builder.mutation({
            query: (body) => ({
                url: "/api/User/location",
                method: "PUT",
                body,
            }),
            invalidatesTags: ["UserLocation"],
        }),

        updateProfile: builder.mutation({
            query: (body) => ({
                url: "/api/User/profile",
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Profile"],
        }),

        uploadProfilePicture: builder.mutation({
            query: (formData: FormData) => ({
                url: "/api/User/avatar",
                method: "POST",
                body: formData,
                headers: { "X-Is-Upload": "true" },
                timeout: UPLOAD_TIMEOUT_MS,
            }),
            invalidatesTags: ["Profile"],
        }),

        getProfile: builder.query({
            query: () => ({
                url: "/api/User/profile",
                method: "GET",
            }),
            providesTags: ["Profile"],
        }),
    }),
});

export const {
    useUpdateProfileMutation,
    useUploadProfilePictureMutation,
    useGetProfileQuery,
    useGetUserLocationQuery,
    useUpdateUserLocationMutation,
} = ProfileService;

export default ProfileService;
