// Project cameos, drawn in our own toon ink (never pasted logos): the smiling SPIKE cactus (style of the project's
// brand mark) and the Cage padlock + key. Both on a 400 x 400 canvas, base at the bottom centre.
import { Pen } from "./toon";

const DK = "#16492a";
export const drawCactus = (p: Pen) => {
  const G = "#6cc04a", HI = "#8fd65e";
  p.ell(200, 382, 120, 12, "rgba(108,192,74,0.25)", 0);
  // arms then trunk
  p.poly([[70, 250], [70, 160], [95, 135], [122, 160], [122, 230], [150, 250], [150, 290], [100, 290]], G, 9);
  p.poly([[330, 230], [330, 150], [305, 125], [278, 150], [278, 220], [250, 240], [250, 280], [300, 280]], G, 9);
  p.poly([[130, 380], [130, 110], [150, 62], [200, 40], [250, 62], [270, 110], [270, 380]], G, 10);
  p.poly([[160, 360], [160, 120], [178, 78], [200, 66], [196, 360]], HI, 0);
  for (const [x, y, a] of [[200, 30, 0], [262, 70, 40], [138, 70, -40], [62, 150, -60], [338, 140, 60]] as const) {
    const r = (a * Math.PI) / 180; p.stroke([[x, y], [x + 18 * Math.sin(r), y - 18 * Math.cos(r)]], 7, DK);
  }
  p.ell(178, 175, 9, 13, DK, 0); p.ell(224, 175, 9, 13, DK, 0);
  p.arc(201, 200, 18, 12, 20, 160, 7, DK);
  for (const [x, y] of [[190, 270], [222, 300], [186, 330]] as const) p.stroke([[x, y], [x, y + 18]], 6, DK);
};
export const drawPadlock = (p: Pen) => {
  const O = "#F0592A", D = "#8a2a10";
  p.arc(170, 170, 62, 70, 180, 360, 26, "#c9cdd4");
  p.poly([[90, 175], [250, 175], [250, 330], [90, 330]], O, 9);
  p.ell(170, 235, 18, 18, D, 0); p.poly([[162, 240], [178, 240], [182, 290], [158, 290]], D, 0);
  // key leaning on the lock
  p.ell(310, 225, 32, 32, "#f3c03a", 8); p.ell(310, 225, 12, 12, "#ffffff", 5);
  p.poly([[300, 255], [320, 255], [320, 360], [300, 360]], "#f3c03a", 7);
  p.poly([[320, 320], [345, 320], [345, 335], [320, 335]], "#f3c03a", 5);
};
