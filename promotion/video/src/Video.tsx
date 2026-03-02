import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { z } from "zod";
import { Opening } from "./scenes/Opening";
import { Demo } from "./scenes/Demo";
import { CTA } from "./scenes/CTA";
import { COLORS } from "./styles/colors";
import { LOCALES } from "./i18n";

export const SparkBananaTeaserSchema = z.object({
  openingFrames: z.number().int().positive(),
  demoFrames: z.number().int().positive(),
  ctaFrames: z.number().int().positive(),
  transitionFrames: z.number().int().positive(),
  backgroundColor: z.string(),
  locale: z.enum(LOCALES),
});

export type SparkBananaTeaserProps = z.infer<typeof SparkBananaTeaserSchema>;

export const getSparkBananaTeaserDuration = (
  props: SparkBananaTeaserProps,
): number => {
  return (
    props.openingFrames +
    props.demoFrames +
    props.ctaFrames -
    props.transitionFrames * 2
  );
};

export const SparkBananaTeaser: React.FC<SparkBananaTeaserProps> = ({
  openingFrames,
  demoFrames,
  ctaFrames,
  transitionFrames,
  backgroundColor,
  locale,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = openingFrames + demoFrames + ctaFrames - transitionFrames * 2;
  const bgmVolume = interpolate(
    frame,
    [0, fps * 1.0, totalFrames - fps * 1.5, totalFrames],
    [0, 0.1, 0.1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: backgroundColor ?? COLORS.bg }}>
      <Audio src={staticFile("Silicon_Grove.mp3")} volume={bgmVolume} />
      <TransitionSeries>
        {/* Opening: icon + title (0:00 - 0:02) */}
        <TransitionSeries.Sequence durationInFrames={openingFrames}>
          <Opening locale={locale} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />
        {/* Demo: Spark Fast + Plan + Banana (0:02 - 0:25) */}
        <TransitionSeries.Sequence durationInFrames={demoFrames}>
          <Demo locale={locale} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />
        {/* CTA: install + GitHub (0:25 - 0:30) */}
        <TransitionSeries.Sequence durationInFrames={ctaFrames}>
          <CTA locale={locale} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
