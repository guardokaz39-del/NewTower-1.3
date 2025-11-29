import { GameScene } from './scenes/GameScene';
import { CONFIG } from './Config';

export class WaveManager {
    private scene: GameScene;
    public isWaveActive: boolean = false;
    private enemiesToSpawn: string[] = [];
    private spawnTimer: number = 0;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    public startWave() {
        if (this.isWaveActive) return;

        this.scene.wave++;
        this.isWaveActive = true;
        
        this.generateWave(this.scene.wave);
        this.scene.showFloatingText(`WAVE ${this.scene.wave}`, this.scene.game.canvas.width / 2, this.scene.game.canvas.height / 2, '#fff');
        
        this.scene.ui.update();
    }

    private generateWave(waveNum: number) {
        // Исправление: CONFIG.WAVES это массив массивов (или объектов, которые сразу содержат данные)
        // Если ошибка говорит "enemies does not exist on type ...[]", значит conf - это массив врагов.
        const conf = CONFIG.WAVES[Math.min(waveNum, CONFIG.WAVES.length) - 1] || CONFIG.WAVES[CONFIG.WAVES.length - 1];
        
        this.enemiesToSpawn = [];
        
        // ВАЖНО: Если conf это уже массив (как [ {type:..., count:...} ]), то перебираем его напрямую
        if (Array.isArray(conf)) {
             conf.forEach((entry: any) => {
                for(let i=0; i<entry.count; i++) {
                    this.enemiesToSpawn.push(entry.type);
                }
            });
        } else if ((conf as any).enemies) {
            // Если вдруг это объект { enemies: [...] }
             (conf as any).enemies.forEach((entry: any) => {
                for(let i=0; i<entry.count; i++) {
                    this.enemiesToSpawn.push(entry.type);
                }
            });
        }
        
        // Перемешиваем
        this.enemiesToSpawn.sort(() => Math.random() - 0.5);
    }

    public update() {
        if (!this.isWaveActive) return;

        // Спавн врагов
        if (this.enemiesToSpawn.length > 0) {
            this.spawnTimer++;
            if (this.spawnTimer >= 60) { // Раз в секунду (примерно)
                const type = this.enemiesToSpawn.shift()!;
                this.scene.spawnEnemy(type);
                this.spawnTimer = 0;
            }
        } else {
            // Если враги кончились и на поле никого нет -> волна закончена
            if (this.scene.enemies.length === 0) {
                this.endWave();
            }
        }
    }

    private endWave() {
        this.isWaveActive = false;
        this.scene.showFloatingText("WAVE CLEARED!", this.scene.game.canvas.width/2, this.scene.game.canvas.height/2, 'gold');
        
        // Награда
        for(let i=0; i<CONFIG.ECONOMY.WAVE_CLEAR_REWARD; i++) {
            this.scene.giveRandomCard();
        }
        
        this.scene.ui.update();
    }
}