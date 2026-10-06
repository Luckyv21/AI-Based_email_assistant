export default function CategoryBadge({ value }) { return value ? <span className={`badge category-${value.toLowerCase()}`}>{value}</span> : null; }
