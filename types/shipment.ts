export interface TransformedJob {
    id: string;
    type: string;
    status: string;
    courierName: string;
    courierConversationId: string | null;
    vehicleType: string;
    vehicleKey: string;
    from: string;
    to: string;
    dateTime: string;
    totalAmount: string;
    distanceKm: number | null;
    createdAt: string;
}
