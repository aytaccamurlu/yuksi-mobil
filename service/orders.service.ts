import { createApi } from "@reduxjs/toolkit/query/react";
import { yuksiBaseQuery } from "./api";

export type OrderDateFilter = "today" | "week" | "month";

export interface OrderAddress {
    city: string;
    district: string;
    neighborhood: string;
    addressText: string;
    buildingNo?: string | null;
}

export interface OrderCargo {
    weightCategory: string;
    isThermal: boolean;
    note?: string | null;
    photos: string[];
}

export interface OrderPricing {
    basePrice: number;
    discount: number;
    total: number;
    currency: string;
}

export interface OrderCarrier {
    name: string;
    rating: number;
    phone: string;
    plate: string;
}

export interface OrderStatusHistoryEntry {
    id: string;
    orderId: string;
    status: string;
    description: string;
    timestamp: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    userId: string;
    status: string;
    serviceType: string;
    carrierType: string;
    pickupLatitude: number;
    pickupLongitude: number;
    pickupLocation: OrderAddress;
    dropoffLocation: OrderAddress;
    cargoDetails: OrderCargo;
    pricing: OrderPricing;
    carrierInfo?: OrderCarrier | null;
    statusHistories: OrderStatusHistoryEntry[];
    createdAt: string;
    updatedAt: string;
}

export interface CompletedOrdersPage {
    page: number;
    limit: number;
    totalCount: number;
    data: Order[];
}

export interface CreateOrderRequest {
    userId: string;
    orderNumber: string;
    serviceType: string;
    carrierType: string;
    pickupLatitude: number;
    pickupLongitude: number;
    pickupLocation: OrderAddress;
    dropoffLocation: OrderAddress;
    cargoDetails: OrderCargo;
    pricing: OrderPricing;
}

export interface CreateOrderResult {
    id: string;
    orderNumber: string;
    message: string;
}

const COMPLETED_ORDERS_PAGE_SIZE = 10;

const fromApiAddress = (a: any): OrderAddress => ({
    city: a?.city ?? "",
    district: a?.district ?? "",
    neighborhood: a?.neighborhood ?? "",
    addressText: a?.addressText ?? a?.address_text ?? "",
    buildingNo: a?.buildingNo ?? a?.building_no ?? null,
});

const fromApiCargo = (c: any): OrderCargo => ({
    weightCategory: c?.weightCategory ?? c?.weight_category ?? "",
    isThermal: c?.isThermal ?? c?.is_thermal ?? false,
    note: c?.note ?? null,
    photos: c?.photos ?? [],
});

const fromApiPricing = (p: any): OrderPricing => ({
    basePrice: p?.basePrice ?? p?.base_price ?? 0,
    discount: p?.discount ?? 0,
    total: p?.total ?? 0,
    currency: p?.currency ?? "TRY",
});

const fromApiCarrier = (c: any): OrderCarrier | null =>
    c
        ? {
              name: c.name ?? "",
              rating: c.rating ?? 0,
              phone: c.phone ?? "",
              plate: c.plate ?? "",
          }
        : null;

const fromApiStatusHistory = (h: any): OrderStatusHistoryEntry => ({
    id: String(h?.id ?? ""),
    orderId: h?.orderId ?? h?.order_id ?? "",
    status: h?.status ?? "",
    description: h?.description ?? "",
    timestamp: h?.timestamp ?? "",
});

const fromApiOrder = (o: any): Order => ({
    id: o?.id ?? "",
    orderNumber: o?.orderNumber ?? o?.order_number ?? "",
    userId: o?.userId ?? o?.user_id ?? "",
    status: o?.status ?? "",
    serviceType: o?.serviceType ?? o?.service_type ?? "",
    carrierType: o?.carrierType ?? o?.carrier_type ?? "",
    pickupLatitude: o?.pickupLatitude ?? o?.pickup_latitude ?? 0,
    pickupLongitude: o?.pickupLongitude ?? o?.pickup_longitude ?? 0,
    pickupLocation: fromApiAddress(o?.pickupLocation ?? o?.pickup_location),
    dropoffLocation: fromApiAddress(o?.dropoffLocation ?? o?.dropoff_location),
    cargoDetails: fromApiCargo(o?.cargoDetails ?? o?.cargo_details),
    pricing: fromApiPricing(o?.pricing),
    carrierInfo: fromApiCarrier(o?.carrierInfo ?? o?.carrier_info),
    statusHistories: ((o?.statusHistories ?? o?.status_histories) || []).map(fromApiStatusHistory),
    createdAt: o?.createdAt ?? o?.created_at ?? "",
    updatedAt: o?.updatedAt ?? o?.updated_at ?? "",
});

const toApiAddress = (a: OrderAddress) => ({
    city: a.city,
    district: a.district,
    neighborhood: a.neighborhood,
    address_text: a.addressText,
    building_no: a.buildingNo ?? null,
});

const toApiCargo = (c: OrderCargo) => ({
    weight_category: c.weightCategory,
    is_thermal: c.isThermal,
    note: c.note ?? null,
    photos: c.photos,
});

const toApiPricing = (p: OrderPricing) => ({
    base_price: p.basePrice,
    discount: p.discount,
    total: p.total,
    currency: p.currency,
});

const OrdersService = createApi({
    reducerPath: "OrdersService",
    keepUnusedDataFor: 300,
    baseQuery: yuksiBaseQuery,
    refetchOnFocus: true,
    tagTypes: ["Orders"],
    endpoints: (builder) => ({
        getActiveOrders: builder.query<Order[], { userId: string; filter?: OrderDateFilter }>({
            query: ({ userId, filter }) => {
                const qs = new URLSearchParams({ userId });
                if (filter) qs.set("filter", filter);
                return `/api/orders/active?${qs.toString()}`;
            },
            transformResponse: (r: any) => (Array.isArray(r) ? r : r?.data ?? []).map(fromApiOrder),
            providesTags: ["Orders"],
        }),

        getCompletedOrders: builder.infiniteQuery<CompletedOrdersPage, { userId: string }, number>({
            infiniteQueryOptions: {
                initialPageParam: 1,
                getNextPageParam: (lastPage) =>
                    lastPage.page * lastPage.limit < lastPage.totalCount ? lastPage.page + 1 : undefined,
                refetchCachedPages: false,
            },
            query: ({ queryArg, pageParam }) => {
                const qs = new URLSearchParams({
                    userId: queryArg.userId,
                    page: String(pageParam),
                    limit: String(COMPLETED_ORDERS_PAGE_SIZE),
                });
                return `/api/orders/completed?${qs.toString()}`;
            },
            transformResponse: (r: any) => ({
                page: r?.page ?? 1,
                limit: r?.limit ?? COMPLETED_ORDERS_PAGE_SIZE,
                totalCount: r?.totalCount ?? r?.total_count ?? 0,
                data: (r?.data ?? []).map(fromApiOrder),
            }),
            providesTags: ["Orders"],
        }),

        getOrderById: builder.query<Order, string>({
            query: (id) => `/api/orders/${id}`,
            transformResponse: (r: any) => fromApiOrder(r),
            providesTags: ["Orders"],
        }),

        createOrder: builder.mutation<CreateOrderResult, CreateOrderRequest>({
            query: (req) => ({
                url: "/api/orders",
                method: "POST",
                body: {
                    user_id: req.userId,
                    order_number: req.orderNumber,
                    service_type: req.serviceType,
                    carrier_type: req.carrierType,
                    pickup_latitude: req.pickupLatitude,
                    pickup_longitude: req.pickupLongitude,
                    pickup_location: toApiAddress(req.pickupLocation),
                    dropoff_location: toApiAddress(req.dropoffLocation),
                    cargo_details: toApiCargo(req.cargoDetails),
                    pricing: toApiPricing(req.pricing),
                },
            }),
            transformResponse: (r: any) => ({
                id: r?.orderId ?? r?.order_id ?? "",
                orderNumber: r?.orderNumber ?? r?.order_number ?? "",
                message: r?.message ?? "",
            }),
            invalidatesTags: ["Orders"],
        }),

        confirmOrder: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/api/orders/${id}/confirm`,
                method: "POST",
            }),
            invalidatesTags: ["Orders"],
        }),
    }),
});

export const {
    useGetActiveOrdersQuery,
    useGetCompletedOrdersInfiniteQuery,
    useGetOrderByIdQuery,
    useCreateOrderMutation,
    useConfirmOrderMutation,
} = OrdersService;

export default OrdersService;
