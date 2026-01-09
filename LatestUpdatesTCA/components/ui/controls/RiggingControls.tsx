
import React from 'react';
import { PlayerConfig } from '../../../types';
import { Slider } from '../CommonControls';

interface RiggingControlsProps {
    config: PlayerConfig;
    setConfig: React.Dispatch<React.SetStateAction<PlayerConfig>>;
}

export const RiggingControls: React.FC<RiggingControlsProps> = ({ config, setConfig }) => {

    const handleConfigChange = (key: keyof PlayerConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-5">
            <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase">Proportions</h4>
                <Slider label="Head" value={config.headScale} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('headScale', v)} />
                <Slider label="Neck H" value={config.neckHeight} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('neckHeight', v)} />
                <Slider label="Neck T" value={config.neckThickness} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('neckThickness', v)} />
                <Slider label="Torso W" value={config.torsoWidth} min={0.5} max={1.5} step={0.1} onChange={(v) => handleConfigChange('torsoWidth', v)} />
                <Slider label="Arm" value={config.armScale} min={0.5} max={1.5} step={0.1} onChange={(v) => handleConfigChange('armScale', v)} />
                <Slider label="Leg" value={config.legScale} min={0.5} max={1.5} step={0.1} onChange={(v) => handleConfigChange('legScale', v)} />
            </div>

            <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase">Hands & Feet</h4>
                <Slider label="Toe Len" value={config.toeLengthScale} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('toeLengthScale', v)} />
                <Slider label="Toe Angle" value={config.toeAngle} min={0} max={0.2} step={0.01} onChange={(v) => handleConfigChange('toeAngle', v)} />
                <Slider label="Thumb X" value={config.thumbX} min={0.02} max={0.08} step={0.002} onChange={(v) => handleConfigChange('thumbX', v)} />
            </div>

            <div className="space-y-1 border-t border-gray-200 pt-2 mt-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase">Torso Details</h4>
                <Slider label="Abs X" value={config.absX} min={-0.05} max={0.05} step={0.002} onChange={(v) => handleConfigChange('absX', v)} />
                <Slider label="Abs Y" value={config.absY} min={-0.1} max={0.1} step={0.005} onChange={(v) => handleConfigChange('absY', v)} />
                <Slider label="Abs Z" value={config.absZ} min={-0.05} max={0.05} step={0.002} onChange={(v) => handleConfigChange('absZ', v)} />
                <Slider label="Abs Spacing" value={config.absSpacing} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('absSpacing', v)} />
                <Slider label="Abs Scale" value={config.absScale} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('absScale', v)} />
                
                <div className="h-2"></div>
                {config.bodyType === 'female' ? (
                    <>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase">Butt</h4>
                        <Slider label="Scale" value={config.buttScale} min={0.5} max={2.0} step={0.05} onChange={(v) => handleConfigChange('buttScale', v)} />
                    </>
                ) : (
                    <>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase">Groin</h4>
                        <Slider label="Bulge X" value={config.bulgeX} min={-0.05} max={0.05} step={0.002} onChange={(v) => handleConfigChange('bulgeX', v)} />
                        <Slider label="Bulge Y" value={config.bulgeY} min={-0.15} max={0.0} step={0.005} onChange={(v) => handleConfigChange('bulgeY', v)} />
                        <Slider label="Bulge Z" value={config.bulgeZ} min={0.05} max={0.2} step={0.005} onChange={(v) => handleConfigChange('bulgeZ', v)} />
                        <Slider label="Bulge Rot X" value={config.bulgeRotX} min={-1.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('bulgeRotX', v)} />
                        <Slider label="Bulge Rot Y" value={config.bulgeRotY} min={-0.5} max={0.5} step={0.05} onChange={(v) => handleConfigChange('bulgeRotY', v)} />
                        <Slider label="Bulge Rot Z" value={config.bulgeRotZ} min={-0.5} max={0.5} step={0.05} onChange={(v) => handleConfigChange('bulgeRotZ', v)} />
                        <Slider label="Bulge Scale" value={config.bulgeScale} min={0.5} max={2.0} step={0.05} onChange={(v) => handleConfigChange('bulgeScale', v)} />
                    </>
                )}
            </div>
        </div>
    );
};
