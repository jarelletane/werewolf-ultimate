import { describe, expect, it } from "vitest";
import { audioUrl } from "./urls";

describe("audioUrl", () => {
  it("keeps audio under a root deployment", () => {
    expect(audioUrl("/audio/narration/01-welcome.mp3", "/")).toBe(
      "/audio/narration/01-welcome.mp3",
    );
  });

  it("places audio under a Vite subdirectory base", () => {
    expect(audioUrl("/audio/night-ambience.mp3", "/werewolf-ultimate/")).toBe(
      "/werewolf-ultimate/audio/night-ambience.mp3",
    );
  });

  it("supports the relative base used by production builds", () => {
    expect(audioUrl("audio/rooster.mp3", "./")).toBe("./audio/rooster.mp3");
  });
});
