import type { AppSettingsService } from "@/api/services";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

let lowStockThreshold = 10;

export const mockAppSettingsService: AppSettingsService = {
  async get() {
    await delay();
    return { lowStockThreshold };
  },

  async update(value: number) {
    await delay();
    lowStockThreshold = value;
    return { lowStockThreshold };
  },
};
