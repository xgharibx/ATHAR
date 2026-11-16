import { z } from "zod";

/**
 * The schema library can compile validators with `new Function` for speed.
 * The content security policy forbids runtime code generation, so the
 * interpreted path is selected up front instead of probing for it.
 */
z.config({ jitless: true });
