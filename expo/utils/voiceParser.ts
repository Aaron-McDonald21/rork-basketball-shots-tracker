import type { ShotCategory } from "@/types/stats";

export interface VoiceCommand {
  type: "category" | "make" | "miss" | "unknown";
  category?: ShotCategory;
}

const categoryKeywords: Record<ShotCategory, string[]> = {
  freeThrows: ["free throw", "freethrow", "free throws", "foul shot", "free", "foul"],
  threePointers: [
    "three point",
    "3 point",
    "three pointer",
    "3 pointer",
    "three-point",
    "3-point",
    "three",
    "threes",
    "tree",
    "trees",
    "trey",
    "downtown",
  ],
  midrange: ["mid range", "midrange", "mid-range", "jumper", "jump shot", "mid"],
  layups: ["layup", "lay up", "lay-up", "layups", "lay", "layer"],
};

const makeKeywords = [
  "make",
  "makes",
  "made",
  "made it",
  "maid",
  "mick",
  "mike",
  "main",
  "mate",
  "swish",
  "bucket",
  "sink",
  "sank",
  "sank it",
  "good",
  "went in",
  "go in",
  "drain",
  "drained",
  "mace",
  "may",
  "lake",
  "take",
  "cake",
  "bake",
  "wake",
  "sake",
  "snake",
  "shake",
  "fake",
  "rake",
  "break",
  "blake",
  "drake",
  "jake",
];

const missKeywords = [
  "miss",
  "misses",
  "missed",
  "miss it",
  "mist",
  "mesh",
  "mess",
  "myth",
  "brick",
  "airball",
  "rimmed out",
  "no good",
  "off",
  "short",
  "long",
  "out",
];

const sanitizeKeyword = (keyword: string): string =>
  keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsKeyword = (text: string, keywords: string[]): boolean => {
  return keywords.some((keyword) => {
    const pattern = new RegExp(`\\b${sanitizeKeyword(keyword)}\\b`, "i");
    return pattern.test(text);
  });
};

const splitIntoSegments = (text: string): string[] =>
  text
    .split(/[.!?,;]+|\band\b|\bthen\b|\bnext\b|\bafter\b/gi)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

export function detectCategory(text: string): ShotCategory | null {
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords) as [
    ShotCategory,
    string[],
  ][]) {
    if (containsKeyword(lowerText, keywords)) {
      console.log("[Voice Parser] Detected category:", category);
      return category;
    }
  }
  return null;
}

export function detectShotResult(text: string): "make" | "miss" | null {
  const lowerText = text.toLowerCase();

  if (containsKeyword(lowerText, makeKeywords)) {
    if (
      !lowerText.includes("didn't make") &&
      !lowerText.includes("did not make") &&
      !lowerText.includes("no make") &&
      !lowerText.includes("not make")
    ) {
      console.log("[Voice Parser] Detected result: make");
      return "make";
    }
  }

  if (containsKeyword(lowerText, missKeywords)) {
    if (
      !lowerText.includes("didn't miss") &&
      !lowerText.includes("did not miss") &&
      !lowerText.includes("no miss") &&
      !lowerText.includes("not miss")
    ) {
      console.log("[Voice Parser] Detected result: miss");
      return "miss";
    }
  }

  return null;
}

export function extractVoiceCommands(text: string): VoiceCommand[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    console.log("[Voice Parser] Empty text, ignoring");
    return [{ type: "unknown" }];
  }

  const commands: VoiceCommand[] = [];
  const segments = splitIntoSegments(trimmed);

  const analyzeSegment = (segment: string) => {
    const category = detectCategory(segment);
    if (category) {
      commands.push({ type: "category", category });
    }
    const result = detectShotResult(segment);
    if (result === "make") {
      commands.push({ type: "make" });
    } else if (result === "miss") {
      commands.push({ type: "miss" });
    }
  };

  if (segments.length > 0) {
    segments.forEach(analyzeSegment);
  } else {
    analyzeSegment(trimmed);
  }

  if (commands.length === 0) {
    analyzeSegment(trimmed);
  }

  return commands.length > 0 ? commands : [{ type: "unknown" }];
}

export function parseVoiceCommand(text: string): VoiceCommand {
  const [firstCommand] = extractVoiceCommands(text);
  if (firstCommand) {
    return firstCommand;
  }
  return { type: "unknown" };
}
