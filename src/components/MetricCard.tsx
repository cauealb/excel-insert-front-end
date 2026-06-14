interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    meta: string;
}

export default function MetricCard({ icon, label, value, meta}: MetricCardProps)  {
    return (
        <div className="metric-card card-hover">
            <div className="metric-icon">{icon}</div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{meta}</small>
        </div>
    );
}