import { getCfg, setCfg } from '@/lib/admin'
import { GOALS_CONFIG_KEY, mergeGoalsConfig, type GoalsConfig } from '@/lib/goalsConfig'

/** Config Goals & Tracker dari admin_config, dilengkapi default. Fail-safe: error baca → default. */
export async function getGoalsConfig(): Promise<GoalsConfig> {
  try {
    const raw = await getCfg(GOALS_CONFIG_KEY)
    return mergeGoalsConfig(raw ? JSON.parse(raw) : {})
  } catch {
    return mergeGoalsConfig({})
  }
}

export async function saveGoalsConfig(cfg: GoalsConfig) {
  await setCfg(GOALS_CONFIG_KEY, JSON.stringify(cfg))
}
