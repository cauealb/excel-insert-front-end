import { getApiBaseUrl } from "../api";

interface ApiCardProps {
    usingFallbackCatalog: boolean
}

export default function ApiCard({ usingFallbackCatalog }: ApiCardProps) {
    return (
        <div className="api-card">
            <span className="api-label">API</span>
            <strong>{getApiBaseUrl()}</strong>
            <span
            className={
                usingFallbackCatalog ? "status-dot warning" : "status-dot ok"
            }
            >
            {usingFallbackCatalog ? "Catalogo local" : "Conectada"}
            </span>
        </div>
    )
}