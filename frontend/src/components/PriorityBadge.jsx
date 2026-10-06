export default function PriorityBadge({ value }) { return value ? <span className={`badge priority-${value.toLowerCase()}`}>{value}</span> : null; }
