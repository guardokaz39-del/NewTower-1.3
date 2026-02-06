import { IGameScene } from '../../scenes/IGameScene';
import { CONFIG } from '../../Config';
import { VISUALS } from '../../VisualConfig';
import { UIUtils } from '../../UIUtils';
import { WaveAnalyst } from './WaveAnalyst';
import { ENEMY_TYPES } from '../../config/Enemies';
import { SoundManager, SoundPriority } from '../../SoundManager';

export class BestiaryUI {
    private scene: IGameScene;
    private analyst: WaveAnalyst;
    private unlockedEnemies: Set<string>;

    private elOverlay!: HTMLElement;
    private elContent!: HTMLElement;
    private elTabsContainer!: HTMLElement;
    private elTabEnemies!: HTMLElement;
    private elTabIntel!: HTMLElement;

    // Content Containers
    private elEnemiesView!: HTMLElement;
    private elIntelView!: HTMLElement;

    private activeTab: 'enemies' | 'intel' = 'enemies';
    private selectedEnemyId: string | null = null;

    constructor(scene: IGameScene, unlockedEnemies: Set<string>) {
        this.scene = scene;
        this.unlockedEnemies = unlockedEnemies;
        this.analyst = new WaveAnalyst(this.scene.waveManager as any, this.unlockedEnemies);

        this.createUI();
    }

    public show() {
        this.elOverlay.style.display = 'flex';
        this.render();
    }

    public hide() {
        this.elOverlay.style.display = 'none';
        SoundManager.play('click', SoundPriority.LOW);
    }

    public toggle() {
        if (this.elOverlay.style.display === 'flex') {
            this.hide();
        } else {
            this.show();
        }
    }

    public unlockEnemy(id: string) {
        if (!this.unlockedEnemies.has(id)) {
            this.unlockedEnemies.add(id);
            if (this.elOverlay.style.display === 'flex') this.render();
        }
    }

    private createUI() {
        // Overlay
        this.elOverlay = UIUtils.createOverlay('bestiary-overlay');
        this.elOverlay.onclick = (e) => {
            if (e.target === this.elOverlay) this.hide();
        };

        // Main Window
        this.elContent = UIUtils.createContainer({
            width: '800px',
            height: '600px',
            background: 'rgba(20, 20, 30, 0.95)',
            border: `2px solid ${VISUALS.UI.COLORS.neutral.light}`,
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflowY: 'hidden'
        });
        // Stop clicks from closing overlay
        this.elContent.onclick = (e) => e.stopPropagation();

        // Header (Tabs + Close)
        const header = UIUtils.createContainer({
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.3)',
            border: 'none', // border is handled by item borders usually
        });
        header.style.borderBottom = `1px solid ${VISUALS.UI.COLORS.neutral.light}`;

        this.elTabsContainer = UIUtils.createContainer({
            display: 'flex',
            height: '100%',
            flexGrow: '1'
        });

        this.elTabEnemies = this.createTab('ENEMIES', 'enemies');
        this.elTabIntel = this.createTab('INTEL', 'intel');

        const closeBtn = UIUtils.createButton(header, '✖', () => this.hide(), {
            background: 'transparent',
            border: 'none',
            color: '#ff4444',
            fontSize: '20px',
            padding: '0 20px',
            fontWeight: 'bold'
        });
        closeBtn.style.marginLeft = 'auto';

        this.elTabsContainer.appendChild(this.elTabEnemies);
        this.elTabsContainer.appendChild(this.elTabIntel);
        header.appendChild(this.elTabsContainer);
        header.appendChild(closeBtn);
        this.elContent.appendChild(header);

        // Views Container
        const viewsContainer = UIUtils.createContainer({
            flexGrow: '1',
            padding: '20px',
            overflowY: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        });

        // Enemies View
        this.elEnemiesView = UIUtils.createContainer({
            width: '100%',
            height: '100%',
            display: 'flex',
            gap: '20px'
        });

        // Intel View
        this.elIntelView = UIUtils.createContainer({
            width: '100%',
            height: '100%',
            display: 'none',
            flexDirection: 'column',
            overflowY: 'auto'
        });

        viewsContainer.appendChild(this.elEnemiesView);
        viewsContainer.appendChild(this.elIntelView);
        this.elContent.appendChild(viewsContainer);

        this.elOverlay.appendChild(this.elContent);
    }

    private createTab(label: string, id: 'enemies' | 'intel'): HTMLElement {
        const tab = document.createElement('div');
        tab.innerText = label;
        Object.assign(tab.style, {
            padding: '0 30px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#888',
            transition: '0.2s'
        });
        tab.onclick = () => {
            this.activeTab = id;
            SoundManager.play('click', SoundPriority.LOW);
            this.render();
        };
        return tab;
    }

    private render() {
        // Tab States
        const activeColor = '#ffd700';
        const inactiveColor = '#888';
        const activeBg = 'rgba(255, 215, 0, 0.1)';

        this.elTabEnemies.style.color = this.activeTab === 'enemies' ? activeColor : inactiveColor;
        this.elTabEnemies.style.background = this.activeTab === 'enemies' ? activeBg : 'transparent';

        this.elTabIntel.style.color = this.activeTab === 'intel' ? activeColor : inactiveColor;
        this.elTabIntel.style.background = this.activeTab === 'intel' ? activeBg : 'transparent';

        // View Visibility
        this.elEnemiesView.style.display = this.activeTab === 'enemies' ? 'flex' : 'none';
        this.elIntelView.style.display = this.activeTab === 'intel' ? 'flex' : 'none';

        if (this.activeTab === 'enemies') {
            this.renderEnemies();
        } else {
            this.renderIntel();
        }
    }

    // --- ENEMIES TAB ---
    private renderEnemies() {
        this.elEnemiesView.innerHTML = '';

        // Left List
        const list = UIUtils.createContainer({
            width: '30%',
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '0 5px 0 0' // padding for scrollbar
        });

        // Right Details
        const details = UIUtils.createContainer({
            width: '70%',
            height: '100%',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column'
        });

        const allEnemies = Object.values(ENEMY_TYPES).filter(e => !e.isHidden);
        let firstUnlockedId = '';

        allEnemies.forEach(e => {
            const isUnlocked = this.unlockedEnemies.has(e.id);
            const item = document.createElement('div');
            Object.assign(item.style, {
                padding: '10px',
                background: this.selectedEnemyId === e.id ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.05)',
                border: this.selectedEnemyId === e.id ? '1px solid #ffd700' : '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            });

            if (isUnlocked) {
                if (!firstUnlockedId) firstUnlockedId = e.id;
                item.innerHTML = `<span style="font-size:20px">${e.symbol}</span> <span>${e.name}</span>`;
            } else {
                item.innerHTML = `<span style="filter:grayscale(1)">❓</span> <span style="color:#555">???</span>`;
            }

            item.onclick = () => {
                if (isUnlocked) {
                    this.selectedEnemyId = e.id;
                    SoundManager.play('click', SoundPriority.LOW);
                    this.renderEnemies(); // Re-render to highlight selection and show details
                }
            };

            list.appendChild(item);
        });

        // Auto-select first if none selected
        if (!this.selectedEnemyId && firstUnlockedId) {
            this.selectedEnemyId = firstUnlockedId;
            // Don't re-render here to avoid loop, just rely on next update or user click
        }

        // Render Details
        if (this.selectedEnemyId) {
            const conf = ENEMY_TYPES[this.selectedEnemyId.toUpperCase()];
            if (conf) {
                details.innerHTML = `
                    <div style="display:flex; gap: 20px; margin-bottom: 20px; align-items:center;">
                        <div style="font-size: 64px; background:rgba(0,0,0,0.5); width:100px; height:100px; display:flex; align-items:center; justify-content:center; border-radius:8px;">
                            ${conf.symbol}
                        </div>
                        <div>
                            <h2 style="margin:0; color:${conf.color || '#fff'}">${conf.name}</h2>
                            <div style="color:#aaa; font-style:italic;">${conf.archetype}</div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:4px;">
                            <div style="color:#888; font-size:12px;">HEALTH</div>
                            <div style="font-size:18px;">${Math.round(CONFIG.ENEMY.BASE_HP * conf.hpMod)} <span style="font-size:12px;color:#aaa">(x${conf.hpMod})</span></div>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:4px;">
                            <div style="color:#888; font-size:12px;">SPEED</div>
                            <div style="font-size:18px;">${conf.speed}</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:4px;">
                            <div style="color:#888; font-size:12px;">REWARD</div>
                            <div style="font-size:18px; color:gold;">${conf.reward}💰</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:4px;">
                            <div style="color:#888; font-size:12px;">THREAT</div>
                            <div style="font-size:18px;">${conf.hpMod > 2 ? 'HIGH' : 'NORMAL'}</div>
                        </div>
                    </div>

                    <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:4px; border-left: 3px solid ${conf.color}">
                        ${conf.desc}
                    </div>
                `;
            }
        } else {
            details.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#555;">Select an enemy</div>`;
        }

        this.elEnemiesView.appendChild(list);
        this.elEnemiesView.appendChild(details);
    }

    // --- INTEL TAB ---
    private renderIntel() {
        this.elIntelView.innerHTML = '';

        const currentWave = this.scene.wave;

        // Show next 5 waves
        for (let i = 0; i < 5; i++) {
            const waveNum = currentWave + i;
            const intel = this.analyst.getWaveIntel(waveNum);

            const card = UIUtils.createContainer({
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '15px',
                marginBottom: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            });

            // Header
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';

            let threatColor = '#4caf50'; // Low
            if (intel.threatLevel === 'MEDIUM') threatColor = '#ffeb3b';
            if (intel.threatLevel === 'HIGH') threatColor = '#ff9800';
            if (intel.threatLevel === 'EXTREME') threatColor = '#f44336';

            header.innerHTML = `
                <div style="font-size: 18px; font-weight: bold; color: ${i === 0 ? '#fff' : '#aaa'}">
                    Wave ${waveNum} ${i === 0 ? '<span style="font-size:12px; background:#4caf50; padding:2px 6px; border-radius:4px; margin-left:10px;">CURRENT</span>' : ''}
                </div>
                <div style="display:flex; gap:15px; font-size:14px;">
                    <span style="color:gold">Est. ${intel.totalReward}💰</span>
                    <span style="color:${threatColor}">⚠️ ${intel.threatLevel}</span>
                </div>
            `;
            card.appendChild(header);

            // Enemies List (Redesigned)
            const enemiesContainer = document.createElement('div');
            enemiesContainer.style.display = 'flex';
            enemiesContainer.style.flexDirection = 'column';
            enemiesContainer.style.gap = '4px';

            intel.enemies.forEach((e, idx) => {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 10px',
                    background: (idx % 2 === 0) ? 'rgba(0,0,0,0.2)' : 'transparent',
                    borderRadius: '4px',
                });

                // Add "NEW" tag if applicable
                const newTag = e.isNew ? `<span style="background:#d32f2f; color:#fff; font-size:10px; padding:2px 4px; border-radius:3px; font-weight:bold; margin-right:5px;">NEW</span>` : '';

                // Name & Type
                // If unlocked, show details. If locked, show limited info.
                const nameStyle = e.isNew ? 'color: #aaa; font-style: italic;' : 'color: #fff; font-weight: 500;';
                const nameText = e.isNew ? 'Unknown Threat' : e.name;
                const iconDisplay = e.isNew ? '<span style="filter:blur(2px) grayscale(1); opacity:0.7">❓</span>' : e.icon;

                row.innerHTML = `
                    <div style="width: 30px; text-align:center; font-size: 20px;">${iconDisplay}</div>
                    <div style="flex-grow: 1; ${nameStyle}">
                        ${newTag}${nameText}
                    </div>
                    <div style="font-weight: bold; color: #ddd;">x${e.count}</div>
                `;

                enemiesContainer.appendChild(row);
            });

            if (intel.enemies.length === 0) {
                enemiesContainer.innerHTML = `<span style="color:#555; padding:10px;">No signal...</span>`;
            }

            card.appendChild(enemiesContainer);
            this.elIntelView.appendChild(card);
        }
    }
}
