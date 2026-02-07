/**
 * Death Animation System Types
 * 
 * Интерфейсы для модульной системы анимаций смерти врагов.
 * Готово к расширению: можно вынести аниматоры в отдельные файлы.
 */

import { EffectSystem } from '../EffectSystem';
import { IEnemyTypeConfig } from '../types';

/**
 * Функция-аниматор смерти.
 * Добавляет визуальные эффекты в EffectSystem.
 */
export interface IDeathAnimator {
    (effects: EffectSystem, x: number, y: number, config: IEnemyTypeConfig): void;
}

/**
 * Конфигурация для настройки анимаций (опционально).
 */
export interface IDeathEffectConfig {
    debrisCount: number;
    particleCount: number;
    color: string;
    velocityX: number;
    velocityY: number;
    size: number;
}
