import type { ServiceDto } from '@/entities/service';
import { ConsultationForm } from '@/features/request-consultation';
import { QueryProvider } from '../providers/query-provider';

export function ConsultationIsland({ services }: { services: ServiceDto[] }) {
  return (
    <QueryProvider>
      <ConsultationForm services={services} />
    </QueryProvider>
  );
}
