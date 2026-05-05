/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as bloodwork from "../bloodwork.js";
import type * as bloodworkPdf from "../bloodworkPdf.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as journal from "../journal.js";
import type * as lib from "../lib.js";
import type * as nutrition from "../nutrition.js";
import type * as pheno from "../pheno.js";
import type * as sleep from "../sleep.js";
import type * as supplements from "../supplements.js";
import type * as training from "../training.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bloodwork: typeof bloodwork;
  bloodworkPdf: typeof bloodworkPdf;
  files: typeof files;
  http: typeof http;
  integrations: typeof integrations;
  journal: typeof journal;
  lib: typeof lib;
  nutrition: typeof nutrition;
  pheno: typeof pheno;
  sleep: typeof sleep;
  supplements: typeof supplements;
  training: typeof training;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
