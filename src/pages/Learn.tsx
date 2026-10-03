import { getWordsByLevel } from '../lib/vocab';
import Flashcard from '../components/Flashcard';
import SessionSummary from '../components/SessionSummary';

export default function Learn() {
  const words = getWordsByLevel('A1');

  return (
    <div className="p-8">
      <SessionSummary />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {words.map((word) => (
          <Flashcard key={word.id} word={word} />
        ))}
      </div>
    </div>
  );
}