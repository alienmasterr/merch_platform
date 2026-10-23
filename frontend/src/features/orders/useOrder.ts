import { useQuery } from '@tanstack/react-query';
import { getOrder } from '../../api/orders';
import { orderKey } from './orderKeys';
import { pollInterval } from './status';

/** Замовлення з автоматичним опитуванням, доки статус не фінальний (SHIPPED / CANCELLED). */
export function useOrder(id: string | undefined, intervalMs = 5000) {
  return useQuery({
    queryKey: orderKey(id ?? ''),
    queryFn: () => getOrder(id ?? ''),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (query) => pollInterval(query.state.data?.status, intervalMs),
  });
}
