const labels = {
  payment_pending: "Payment Pending",
  payment_confirmed: "Payment Confirmed",
  order_in_progress: "Order In Progress",
  order_shipped: "Order Shipped",
  order_delivered: "Order Delivered",
  booking_pending: "Booking Pending",
  booking_confirmed: "Booking Confirmed",
  already_booked: "Already Booked",
};

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{labels[status] || status}</span>;
}

export const orderStatuses = [
  "payment_pending",
  "payment_confirmed",
  "order_in_progress",
  "order_shipped",
  "order_delivered",
];

export const bookingStatuses = [
  "booking_pending",
  "booking_confirmed",
  "already_booked",
];

export default StatusBadge;
