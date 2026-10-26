import type { ServiceDto } from '@/entities/service';
import { ConsultationDialog } from '@/features/request-consultation';
import { QueryProvider } from '../providers/query-provider';
import type { ConsultationRequestDto } from '@/shared/api';

export function ConsultationIsland({
  services,
  source,
}: {
  services: ServiceDto[];
  source: NonNullable<ConsultationRequestDto['source']>;
}) {
  return (
    <QueryProvider>
      <ConsultationDialog services={services} source={source} />
    </QueryProvider>
  );
}
