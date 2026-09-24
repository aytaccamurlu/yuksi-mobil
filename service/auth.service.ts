import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

const AuthService = createApi({
  reducerPath: "AuthService",
  baseQuery: yuksiBaseQuery,
  endpoints: (builder) => ({
    sendLoginRequest: builder.mutation({
      query: (body) => ({
        url: "/api/auth/login",
        method: "POST",
        body,
      }),
    }),

    sendRegisterRequest: builder.mutation({
      query: (body) => ({
        url: "/api/auth/register",
        method: "POST",
        body,
      }),
    }),


    logout: builder.mutation({
      query: (refreshToken) => ({
        url: "/api/auth/logout",
        method: "POST",
        body: { refresh_token: refreshToken },
      }),
    }),

    sendForgotPasswordRequest: builder.mutation({
      query: (email: string) => ({
        url: "/api/auth/forgot-password",
        method: "POST",
        body: { email },
      }),
    }),

    changePassword: builder.mutation<any, { currentPassword: string; newPassword: string }>({
      query: (body) => ({
        url: "/api/auth/change-password",
        method: "POST",
        body: { old_password: body.currentPassword, new_password: body.newPassword },
      }),
    }),

    resetPassword: builder.mutation<any, { email: string; code: string; newPassword: string }>({
      query: (body) => ({
        url: "/api/auth/reset-password",
        method: "POST",
        body: { email: body.email, verification_code: body.code, new_password: body.newPassword },
      }),
    }),

  }),
});

export const {
  useSendLoginRequestMutation,
  useSendRegisterRequestMutation,
  useLogoutMutation,
  useSendForgotPasswordRequestMutation,
  useChangePasswordMutation,
  useResetPasswordMutation,
} = AuthService;

export default AuthService;
