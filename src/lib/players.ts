export type FeaturedPlayer = {
  /** FotMob player id. */
  id: string;
  name: string;
  /** A file under /public. Without one, the spotlight falls back to a club-colour block. */
  photo?: string;
};

/** The player shown in the dashboard's spotlight tile. */
export const SPOTLIGHT_PLAYER: FeaturedPlayer = { id: "696679", name: "Raphinha", photo: "/players/raphinha.jpg" };
