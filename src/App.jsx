import { useState } from 'react';
import WelcomeScreen from './screens/WelcomeScreen.jsx';
import CompleteScreen from './screens/CompleteScreen.jsx';
import { startLab, advance, getStudentInfo, getAllAnswers } from './lab-engine.js';
import { getLabScores, getTotalScore, getMaxScores, generateReport } from './scoring.js';

export default function App() {
  const [phase, setPhase] = useState('welcome'); // welcome | lab | complete
  const [reportData, setReportData] = useState(null);
  const [LabScreen, setLabScreen] = useState(null);

  async function handleStart(name, github) {
    const labModule = await import('./screens/LabScreen.jsx');
    setLabScreen(() => labModule.default);
    startLab(name, github);
    setPhase('lab');
  }

  async function handleComplete() {
    advance();
    const { name, github } = getStudentInfo();
    const scores = getLabScores();
    const maxScores = getMaxScores();
    const total = getTotalScore();
    const answers = getAllAnswers();
    const reportCode = await generateReport(name, github, answers);
    setReportData({ name, github, scores, maxScores, total, reportCode });
    setPhase('complete');
  }

  if (phase === 'welcome') return <WelcomeScreen onStart={handleStart} />;
  if (phase === 'lab')     return <LabScreen onComplete={handleComplete} />;
  if (phase === 'complete') return <CompleteScreen data={reportData} />;
  return null;
}
