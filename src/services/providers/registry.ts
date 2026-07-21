import type { IProviderAdapter } from '@/types'
import { ProviderType } from '@/types'

export class AdapterRegistry {
  private adapters = new Map<ProviderType, IProviderAdapter>()

  register(adapter: IProviderAdapter): void {
    this.adapters.set(adapter.type, adapter)
  }

  get(type: ProviderType): IProviderAdapter | undefined {
    return this.adapters.get(type)
  }

  getAll(): IProviderAdapter[] {
    return Array.from(this.adapters.values())
  }

  hasQuota(type: ProviderType): boolean {
    return this.adapters.get(type)?.info.hasQuota ?? false
  }
}

export const adapterRegistry = new AdapterRegistry()
