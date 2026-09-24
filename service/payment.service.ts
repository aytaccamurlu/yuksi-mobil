import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

// Gerçek backend snake_case + card_holder_name/is_default kullanıyor, kart
// takma adı (name) desteklemiyor ve last4/brand'i kendisi hesaplıyor — mock
// da artık aynı şekli üretiyor, burada tek yerde camelCase'e çevriliyor.
const fromApiCard = (card: any) => ({
    id: card.id,
    brand: card.brand,
    last4: card.last4,
    holder: card.card_holder_name ?? card.holder,
    expiryMonth: card.expiry_month ?? card.expiryMonth,
    expiryYear: card.expiry_year ?? card.expiryYear,
    isDefault: card.is_default ?? card.isDefault ?? false,
});

const PaymentService = createApi({
    reducerPath: "PaymentService",
    baseQuery: yuksiBaseQuery,
    tagTypes: ["Cards"],
    endpoints: (builder) => ({
        getPaymentMethods: builder.query<any, void>({
            query: () => ({
                url: "/api/User/payment-methods",
                method: "GET",
            }),
            transformResponse: (response: any) => {
                const list = response?.payment_methods ?? response?.data ?? (Array.isArray(response) ? response : []);
                return list.map(fromApiCard);
            },
            providesTags: ["Cards"],
        }),

        addPaymentMethod: builder.mutation<any, { cardNumber: string; holder: string; expiryMonth: string; expiryYear: string }>({
            query: (body) => ({
                url: "/api/User/payment-methods",
                method: "POST",
                body: {
                    card_number: body.cardNumber,
                    card_holder_name: body.holder,
                    expiry_month: Number(body.expiryMonth),
                    expiry_year: 2000 + Number(body.expiryYear),
                },
            }),
            transformResponse: (response: any) => fromApiCard(response?.payment_method ?? response?.data ?? response),
            invalidatesTags: ["Cards"],
        }),

        deletePaymentMethod: builder.mutation<any, string>({
            query: (id) => ({
                url: `/api/User/payment-methods/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Cards"],
        }),

        setDefaultPaymentMethod: builder.mutation<any, string>({
            query: (id) => ({
                url: `/api/User/payment-methods/${id}/default`,
                method: "POST",
            }),
            invalidatesTags: ["Cards"],
        }),
    }),
});

export const {
    useGetPaymentMethodsQuery,
    useAddPaymentMethodMutation,
    useDeletePaymentMethodMutation,
    useSetDefaultPaymentMethodMutation,
} = PaymentService;

export default PaymentService;
