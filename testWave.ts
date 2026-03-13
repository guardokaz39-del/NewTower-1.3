import { WaveManager } from './src/WaveManager';
import { GameState } from './src/scenes/GameState';

class MockScene {
    public wave: number = 0;
    public lives: number = 20;
    public enemies: any[] = [];
    public game = { width: 800 };
    public mapData = { waves: [] };
    public metrics = { trackWaveReached: () => {}, trackMoneyEarned: () => {} };
    public cardsGiven = 0;
    public money = 0;
    
    addMoney(val: number) { this.money += val; }
    spawnEnemy(type: string) { this.enemies.push({ type }); }
    showFloatingText() {}
    giveRandomCard() { this.cardsGiven++; }
}

const scene = new MockScene() as any;
const wm = new WaveManager(scene, 123);

console.log("Before start:", scene.cardsGiven);
wm.startWave();
console.log("Wave started. Wave:", scene.wave);

wm.update(0.1);

// simulate enemies dying
scene.enemies = [];
wm.spawnQueue = []; // Clear queue to force endWave()

wm.update(0.1); // This should call endWave()

console.log("After endWave. Cards given:", scene.cardsGiven);
