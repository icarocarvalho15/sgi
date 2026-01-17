import { useState, useEffect } from 'react';
import api from '../api/axios';

interface PlanFeature {
    current: number;
    max: number;
    is_unlimited: boolean;
    percent: number;
}

interface PlanUsage {
    features: {
        users: PlanFeature;
        products: PlanFeature;
        customers: PlanFeature;
    };
}

export function usePlanLimiter() {
    const [usage, setUsage] = useState<PlanUsage | null>(null);
    const [loading, setLoading] = useState(true);
    
    const fetchUsage = () => {
        setLoading(true);
        api.get('/tenant/plan-usage')
        .then(res => setUsage(res.data))
        .catch(err => console.error("Erro ao verificar limites", err))
        .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsage();
    }, []);
    
    const canCreate = (resource: 'users' | 'products' | 'customers'): boolean => {
        if (!usage) return false;
        const feature = usage.features[resource];
        if (!feature) return true;
        if (feature.is_unlimited) return true;
        return feature.current < feature.max;
    };
    
    return { canCreate, usage, loading, refreshUsage: fetchUsage };
}