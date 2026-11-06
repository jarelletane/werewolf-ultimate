import { ROLES, RoleId } from "../engine/game";

export type ObjectiveClip = { src: string; text: string };

export const ROLE_OBJECTIVES_INTRO: ObjectiveClip = {
  src: "/audio/narration/80-role-objectives-intro.mp3",
  text: "Listen carefully for your role. Keep your identity secret, and follow the objective described for your card.",
};

export const ROLE_OBJECTIVES_OUTRO: ObjectiveClip = {
  src: "/audio/narration/97-role-objectives-outro.mp3",
  text: "Those are the roles included in this game. Keep your card hidden, listen carefully, and trust no one completely.",
};

export const ROLE_OBJECTIVE_CLIPS: Record<RoleId, ObjectiveClip> = {
  villager: { src: "/audio/narration/81-villager-objective.mp3", text: "Villager. You have no special night ability. Listen carefully, question suspicious behaviour, and work with the village to identify and eliminate every Werewolf." },
  seer: { src: "/audio/narration/82-seer-objective.mp3", text: "Seer. Each night, investigate one player to learn whether they are aligned with the Werewolves. Use this knowledge carefully. Revealing what you know may help the village, but it may also make you a target." },
  doctor: { src: "/audio/narration/83-doctor-objective.mp3", text: "Doctor. Each night after the first, choose one player to protect from a Werewolf attack. Watch the discussion carefully and protect the person you believe the village cannot afford to lose." },
  witch: { src: "/audio/narration/84-witch-objective.mp3", text: "Witch. You possess one healing potion and one poison potion for the entire game. Use them carefully. Once a potion has been used, it is gone." },
  hunter: { src: "/audio/narration/85-hunter-objective.mp3", text: "Hunter. You have no night action. If you are eliminated, you may choose one living player to take down with you. Watch everyone closely, because your final decision may determine the winner." },
  bodyguard: { src: "/audio/narration/86-bodyguard-objective.mp3", text: "Bodyguard. Each night, choose one player to protect from an attack. Use the discussion and voting patterns to decide who may need your protection most." },
  detective: { src: "/audio/narration/87-detective-objective.mp3", text: "Detective. Each night, investigate one player to discover their exact role. Protect your identity and decide carefully when your information should influence the village." },
  priest: { src: "/audio/narration/88-priest-objective.mp3", text: "Priest. In this ruleset, you have no special night action. Observe the village, question suspicious players, and help eliminate every Werewolf." },
  tough: { src: "/audio/narration/89-tough-villager-objective.mp3", text: "Tough Villager. The first Werewolf attack against you will fail, but you will not be protected forever. Use your extra chance to help the village uncover the Werewolves." },
  apprentice: { src: "/audio/narration/90-apprentice-seer-objective.mp3", text: "Apprentice Seer. At first, you have no investigation of your own. If the Seer is eliminated, you inherit the Seer's ability and may investigate one player each night." },
  cupid: { src: "/audio/narration/91-cupid-objective.mp3", text: "Cupid. On the first night, choose two players to become Lovers. If either Lover dies, the other will die as well. Choose carefully, then help the village eliminate every Werewolf." },
  werewolf: { src: "/audio/narration/92-werewolf-objective.mp3", text: "Werewolf. Each night after the first, awaken with the pack and choose a player to eliminate. By day, hide your identity, redirect suspicion, and survive until the Werewolves equal or outnumber everyone else." },
  alpha: { src: "/audio/narration/93-alpha-wolf-objective.mp3", text: "Alpha Wolf. You are a member of the Werewolf pack. Wake and hunt with the other Werewolves, conceal your identity during the day, and help the pack take control of the village." },
  silencer: { src: "/audio/narration/94-silencer-objective.mp3", text: "Silencer. You are aligned with the Werewolves. Each night, choose one player who must remain silent during the following day. Use silence to disrupt the village and protect the pack." },
  serial: { src: "/audio/narration/95-serial-killer-objective.mp3", text: "Serial Killer. Each night, choose one player to eliminate. You belong to neither the village nor the Werewolves. Survive every other player and become the last person standing." },
  jester: { src: "/audio/narration/96-jester-objective.mp3", text: "Jester. Your goal is not to survive. Convince the village to eliminate you during the daytime vote. If another cause removes you from the game, your objective has not been completed." },
};

export function selectedRoleIds(deckRoles: Partial<Record<RoleId, number>>): RoleId[] {
  return ROLES.filter((role) => (deckRoles[role.id] ?? 0) > 0).map((role) => role.id);
}

export function roleObjectiveSequence(deckRoles: Partial<Record<RoleId, number>>): ObjectiveClip[] {
  return [ROLE_OBJECTIVES_INTRO, ...selectedRoleIds(deckRoles).map((role) => ROLE_OBJECTIVE_CLIPS[role]), ROLE_OBJECTIVES_OUTRO];
}
