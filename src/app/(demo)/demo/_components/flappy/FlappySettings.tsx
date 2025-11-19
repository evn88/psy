import React from 'react';

interface FlappySettingsProps {
    containerWidth: number;
    gameSpeed: number;
    gravity: number;
    onChangeGameSpeed: (value: number) => void;
    onChangeGravity: (value: number) => void;
    isGameRunning: boolean;
}

/**
 * Панель настроек игры (скорость и гравитация).
 * Вынесена в отдельный компонент для упрощения чтения и переиспользования.
 */
export default function FlappySettings({
                                           containerWidth,
                                           gameSpeed,
                                           gravity,
                                           onChangeGameSpeed,
                                           onChangeGravity,
                                           isGameRunning,
                                       }: FlappySettingsProps) {
    return (
        <div
            style={{
                marginTop: '24px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                backgroundColor: '#f9fafb',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                width: `${containerWidth}px`,
            }}
        >
            <div style={{display: 'flex', flexDirection: 'column'}}>
                <label
                    style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}
                >
                    <span>Скорость:</span>
                    <span style={{color: '#0284c7'}}>{gameSpeed}</span>
                </label>
                <input
                    type="range"
                    min="2"
                    max="15"
                    step="1"
                    value={gameSpeed}
                    onChange={(e) => onChangeGameSpeed(Number(e.target.value))}
                    disabled={isGameRunning}
                    style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#d1d5db',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        accentColor: '#0284c7',
                    }}
                />
            </div>

            <div style={{display: 'flex', flexDirection: 'column'}}>
                <label
                    style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}
                >
                    <span>Гравитация:</span>
                    <span style={{color: '#0284c7'}}>{gravity}</span>
                </label>
                <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.1"
                    value={gravity}
                    onChange={(e) => onChangeGravity(Number(e.target.value))}
                    style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#d1d5db',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        accentColor: '#0284c7',
                    }}
                />
            </div>
        </div>
    );
}
