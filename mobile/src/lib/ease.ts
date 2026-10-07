import { Easing, FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";

/**
 * One calm, Apple-style motion language for the app: no springs, no bounce.
 * IOS is the curve iOS uses for sheets and system transitions: quick to start,
 * long gentle settle, never overshoots.
 */
export const IOS = Easing.bezier(0.32, 0.72, 0, 1);

export const DUR = { press: 110, release: 200, small: 220, enter: 340, sheet: 380, exit: 220 } as const;

/** Content appearing: a short rise with a fade. */
export const enterRise = (delay = 0) => FadeInDown.delay(delay).duration(DUR.enter).easing(IOS).withInitialValues({ transform: [{ translateY: 10 }] });
/** Content appearing in place. */
export const enterFade = (delay = 0) => FadeIn.delay(delay).duration(DUR.enter).easing(IOS);
/** Lists re-ordering: items slide to their new place. */
export const layoutMove = LinearTransition.duration(DUR.enter).easing(IOS);
