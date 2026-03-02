import { CalculateMetadataFunction, Composition } from "remotion";
import {
  SparkBananaTeaser,
  SparkBananaTeaserProps,
  SparkBananaTeaserSchema,
  getSparkBananaTeaserDuration,
} from "./Video";
import { COLORS } from "./styles/colors";

const defaultProps = {
  openingFrames: 75,
  demoFrames: 630,
  ctaFrames: 170,
  transitionFrames: 10,
  backgroundColor: COLORS.bg,
  locale: "en",
} satisfies SparkBananaTeaserProps;

const defaultJaProps = {
  ...defaultProps,
  locale: "ja",
} satisfies SparkBananaTeaserProps;

const calculateMetadata: CalculateMetadataFunction<SparkBananaTeaserProps> = ({
  props,
}) => {
  return {
    durationInFrames: getSparkBananaTeaserDuration(props),
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SparkBananaTeaser"
        component={SparkBananaTeaser}
        durationInFrames={getSparkBananaTeaserDuration(defaultProps)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
        schema={SparkBananaTeaserSchema}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="SparkBananaTeaserJa"
        component={SparkBananaTeaser}
        durationInFrames={getSparkBananaTeaserDuration(defaultJaProps)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultJaProps}
        schema={SparkBananaTeaserSchema}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
