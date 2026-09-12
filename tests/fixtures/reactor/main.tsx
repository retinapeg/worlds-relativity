import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactorPanel } from '../../../src/reactor/ReactorPanel';
import { Simulation } from '../../../src/controls/simulation';
import { fixture } from './sdk';
import '../../../src/ui/style.css';

function Fixture() {
  const [beta, setBeta] = useState(0);
  const [lookYaw, setView] = useState(0), [opticalBaseline, setBaseline] = useState(false);
  fixture.setBeta = setBeta;
  fixture.setView = setView; fixture.setBaseline = setBaseline;
  const simulation = new Simulation(false); simulation.setVelocity(beta);
  return <main style={{ padding: 24 }}>
    <style>{'.world-panel {position:relative;inset:auto;width:min(800px,100%);margin:0 auto} .world-screen {height:400px}'}</style>
    <p>TEST FIXTURE · synthetic local video · no provider sessions</p>
    <ReactorPanel snapshot={{ ...simulation.snapshot(), lookYaw, lookPitch: 0, opticalBaseline, tourStage: 'Fixture' }} />
  </main>;
}
const root = createRoot(document.getElementById('fixture-root')!);
fixture.unmount = () => root.unmount();
root.render(<Fixture />);
