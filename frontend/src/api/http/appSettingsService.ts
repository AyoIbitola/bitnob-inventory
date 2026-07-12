import type { AppSettingsService } from "@/api/services";
import { request } from "@/api/http";
import type { AppSettingsOut } from "./mappers";

export const httpAppSettingsService: AppSettingsService = {
  async get() {
    const out = await request<AppSettingsOut>("/settings");
    return { lowStockThreshold: out.low_stock_threshold };
  },

  async update(lowStockThreshold: number) {
    const out = await request<AppSettingsOut>("/settings", {
      method: "PATCH",
      body: { low_stock_threshold: lowStockThreshold },
    });
    return { lowStockThreshold: out.low_stock_threshold };
  },
};
