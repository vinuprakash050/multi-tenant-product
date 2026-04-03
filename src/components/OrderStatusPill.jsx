function OrderStatusPill({ status }) {
  return <span className={`status-pill status-${status}`}>{status.replaceAll('-', ' ')}</span>;
}

export default OrderStatusPill;
