export declare enum CardType {
    TOWER = "tower",
    SPELL = "spell"
}
export interface ICardConfig {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: CardType;
    value: number;
}
export declare class Card {
    id: string;
    name: string;
    cost: number;
    level: number;
    private config;
    constructor(config: ICardConfig);
    upgrade(): void;
}
//# sourceMappingURL=Card.d.ts.map