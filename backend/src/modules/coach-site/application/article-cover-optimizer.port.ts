export interface ArticleCoverOptimizerPort {
  optimize(data: Uint8Array): Promise<Uint8Array>
}
