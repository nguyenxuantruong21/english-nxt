import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Levels from "./pages/Levels";
import LevelDetail from "./pages/LevelDetail";
import TopicDetail from "./pages/TopicDetail";
import WordDetail from "./pages/WordDetail";
import Learn from "./pages/Learn";
import Practice from "./pages/Practice";
import PracticeRound from "./pages/PracticeRound";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="levels" element={<Levels />} />
        <Route path="levels/:level" element={<LevelDetail />} />
        <Route path="topics/:topicId" element={<TopicDetail />} />
        <Route path="words/:id" element={<WordDetail />} />
        <Route path="learn" element={<Learn />} />
        <Route path="learn/:topicId" element={<Learn />} />
        <Route path="practice" element={<Practice />} />
        <Route path="practice/:kind" element={<PracticeRound />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="*"
          element={
            <div className="p-8 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-2 font-semibold">Không tìm thấy trang</p>
              <Link to="/" className="mt-2 inline-block text-indigo-600">
                Về trang chủ
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
