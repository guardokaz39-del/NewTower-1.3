export enum CardType {
    TOWER = 'tower',
    SPELL = 'spell',
}

export interface ICardConfig {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: CardType;
    value: number;
}

export class Card {
    public id: string;
    public name: string;
    public cost: number;
    public level: number = 1;
    private config: ICardConfig;

    constructor(config: ICardConfig) {
        this.id = config.id;
        this.name = config.name;
        this.cost = config.cost;
        this.config = config;
    }

    public upgrade(): void {
        this.level += 1;
        this.cost = Math.floor(this.cost * 1.5);
    }
}
