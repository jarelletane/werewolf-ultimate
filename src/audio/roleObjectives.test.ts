import { describe, expect, it } from "vitest";
import { roleObjectiveSequence, selectedRoleIds } from "./roleObjectives";

describe("role objective guide", () => {
  it("includes only roles present in the selected deck", () => {
    expect(selectedRoleIds({ villager: 3, werewolf: 2, seer: 1, doctor: 0 })).toEqual([
      "villager", "werewolf", "seer",
    ]);
  });

  it("narrates each selected role once regardless of card count", () => {
    const sequence = roleObjectiveSequence({ villager: 4, werewolf: 2 });
    expect(sequence.map((clip) => clip.src)).toEqual([
      "/audio/narration/80-role-objectives-intro.mp3",
      "/audio/narration/81-villager-objective.mp3",
      "/audio/narration/92-werewolf-objective.mp3",
      "/audio/narration/97-role-objectives-outro.mp3",
    ]);
  });
});
