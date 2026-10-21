/**
 * Guides written ahead of time and published on a schedule (see liveAt in
 * ../guides.ts). Each batch file holds a handful of guides with their
 * publish date and time; a guide may only link to guides that are already
 * live when it goes live (tests/seo.test.mts checks this).
 */
import type { Guide } from "../guides";
import { BATCH_01 } from "./batch-01";
import { BATCH_02 } from "./batch-02";
import { BATCH_03 } from "./batch-03";
import { BATCH_04 } from "./batch-04";
import { BATCH_05 } from "./batch-05";
import { BATCH_06 } from "./batch-06";
import { BATCH_07 } from "./batch-07";
import { BATCH_08 } from "./batch-08";
import { BATCH_09 } from "./batch-09";
import { BATCH_10 } from "./batch-10";

export const SCHEDULED_GUIDES: Guide[] = [...BATCH_01, ...BATCH_02, ...BATCH_03, ...BATCH_04, ...BATCH_05, ...BATCH_06, ...BATCH_07, ...BATCH_08, ...BATCH_09, ...BATCH_10];
