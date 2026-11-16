// Back-compat shim: Otto is now just characters/otto.json drawn by the character kit.
import { Pen } from "./toon";
import { drawCharacter, CharacterSpec, Pose } from "./character";
import OTTO_JSON from "./characters/otto.json";
export const OTTO: CharacterSpec = OTTO_JSON as CharacterSpec;
export type OttoOpts = Pose;
export const drawOtto = (p: Pen, o: OttoOpts = {}) => drawCharacter(p, OTTO, o);
