import { USE_MOCK_API } from "@/config";
import type {
  AppSettingsService,
  AuthService,
  CategoriesService,
  ItemsService,
  UsersService,
} from "./services";

import { httpAppSettingsService } from "./http/appSettingsService";
import { httpAuthService } from "./http/authService";
import { httpCategoriesService } from "./http/categoriesService";
import { httpItemsService } from "./http/itemsService";
import { httpUsersService } from "./http/usersService";
import { mockAppSettingsService } from "./mock/appSettingsService";
import { mockAuthService } from "./mock/authService";
import { mockCategoriesService } from "./mock/categoriesService";
import { mockItemsService } from "./mock/itemsService";
import { mockUsersService } from "./mock/usersService";

/**
 * The single switch between mock and real backend. Flip VITE_USE_MOCK_API to
 * change every consumer at once. Components import { authService, itemsService }
 * from "@/api" and never know which implementation they got.
 */
export const authService: AuthService = USE_MOCK_API ? mockAuthService : httpAuthService;
export const itemsService: ItemsService = USE_MOCK_API ? mockItemsService : httpItemsService;
export const usersService: UsersService = USE_MOCK_API ? mockUsersService : httpUsersService;
export const categoriesService: CategoriesService = USE_MOCK_API
  ? mockCategoriesService
  : httpCategoriesService;
export const appSettingsService: AppSettingsService = USE_MOCK_API
  ? mockAppSettingsService
  : httpAppSettingsService;

export { ApiError, registerTokenProvider, registerUnauthorizedHandler } from "./http";
export type {
  AppSettingsService,
  AuthService,
  CategoriesService,
  ItemsService,
  UsersService,
} from "./services";
