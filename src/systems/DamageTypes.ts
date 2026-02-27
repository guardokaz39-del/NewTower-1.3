export enum DamageTags {
    NONE = 0,
    SPLASH = 1 << 0,
    DOT = 1 << 1,
    EXPLOSION = 1 << 2,
    CRIT = 1 << 3,
    TRUE_DAMAGE = 1 << 4,
}

export enum CardTypeIds {
    UNKNOWN = 0,
    FIRE = 1,
    ICE = 2,
    SNIPER = 3,
    MULTISHOT = 4,
    MINIGUN = 5
}
