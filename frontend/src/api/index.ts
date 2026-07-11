import { USE_MOCK_API } from "@/config";
import type { AuthService, ItemsService, UsersService } from "./services";

import { httpAuthService } from "./http/authService";
import { httpItemsService } from "./http/itemsService";
import { httpUsersService } from "./http/usersService";
import { mockAuthService } from "./mock/authService";
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

export { ApiError, registerTokenProvider, registerUnauthorizedHandler } from "./http";
export type { AuthService, ItemsService, UsersService } from "./services";
