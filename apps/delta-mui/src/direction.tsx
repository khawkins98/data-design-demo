/**
 * MUI's documented step 3 for right-to-left, which this pairing had been missing.
 *
 * WHAT WENT WRONG BEFORE. MUI's RTL guide has three steps: a `dir` attribute, a
 * theme with `direction: "rtl"`, and an emotion cache carrying an RTL stylis
 * plugin. This evaluation did the first two and stopped, then measured the result
 * and recorded "RTL is not achievable in the MUI Community tier" as a blocker. It
 * was our omission, not MUI's limit: steps 1 and 2 flip the components that read
 * `theme.direction` in their own code, and step 3 is what flips the *emitted CSS*.
 * Without it every physical `left`/`right` MUI writes stays physical - which is
 * exactly the 870px floating-label offset and the wizard's broken step connector.
 *
 * WHY THE OMISSION LASTED. The blocker said the fix needed `stylis-plugin-rtl`, a
 * third-party package that Brief 1 constraint 2 forbids, and that was true of the
 * `styled-components` package of that name - last published in 2021. MUI has since
 * published its own: `@mui/stylis-plugin-rtl`, source in `packages/
 * mui-stylis-plugin-rtl` of the `mui/material-ui` monorepo, MIT, released in
 * lockstep with `@mui/material` (both 9.3.0 here). It is first-party and in the
 * Community tier, so constraint 2 never applied to it.
 *
 * WHAT THIS COSTS, WHICH IS THE POINT WORTH RECORDING. One provider at the root of
 * the candidate subtree and two dependencies. It is not "RTL in a lot more places":
 * no component takes an RTL prop, no stylesheet is rewritten by hand, and the
 * per-view cost is one wrapper. That is a genuinely cheap answer, and it is
 * MUI's own documented one.
 *
 * BOTH DIRECTIONS GET A CACHE, deliberately. Rendering LTR through emotion's
 * default cache and RTL through a custom one would change more than the plugin
 * between the two states - insertion order and the generated class prefix included
 * - so a difference measured between them could not be attributed to direction
 * alone. Two caches built the same way, differing only in the plugin, keeps that
 * comparison honest. The `key` differs because emotion requires it, and because a
 * shared key would let one direction's cached rules serve the other.
 */

import createCache from "@emotion/cache";
import type { EmotionCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import rtlPlugin from "@mui/stylis-plugin-rtl";
import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { prefixer } from "stylis";

export function createDirectionCache(dir: "ltr" | "rtl"): EmotionCache {
  return createCache({
    key: dir === "rtl" ? "muirtl" : "muiltr",
    stylisPlugins: dir === "rtl" ? [prefixer, rtlPlugin] : [prefixer],
  });
}

/**
 * Wraps the candidate subtree. Must sit INSIDE the `?candidate=off` guard along
 * with everything else MUI, or the baseline render would mount an emotion cache
 * and stop being an empty subtree.
 */
export function DirectionProvider({
  dir,
  children,
}: {
  readonly dir: "ltr" | "rtl";
  readonly children: ReactNode;
}): ReactElement {
  const cache = useMemo(() => createDirectionCache(dir), [dir]);
  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
